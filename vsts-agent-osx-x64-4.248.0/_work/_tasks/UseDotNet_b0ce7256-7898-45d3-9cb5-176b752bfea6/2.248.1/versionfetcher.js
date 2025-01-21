"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DotNetCoreVersionFetcher = void 0;
const os = require("os");
const fs = require("fs");
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const httpClient = require("typed-rest-client/HttpClient");
const models_1 = require("./models");
const utils = require("./versionutilities");
const nodeVersion = parseInt(process.version.split('.')[0].replace('v', ''));
if (nodeVersion > 16) {
    require("dns").setDefaultResultOrder("ipv4first");
    tl.debug("Set default DNS lookup order to ipv4 first");
}
if (nodeVersion > 19) {
    require("net").setDefaultAutoSelectFamily(false);
    tl.debug("Set default auto select family to false");
}
class DotNetCoreVersionFetcher {
    constructor(explicitVersioning = false) {
        this.explicitVersioning = false;
        this.explicitVersioning = explicitVersioning;
        let proxyUrl = tl.getVariable("agent.proxyurl");
        const timeout = this.getRequestTimeout();
        var requestOptions = {
            allowRetries: true,
            maxRetries: 3,
            socketTimeout: timeout,
            globalAgentOptions: {
                timeout: timeout
            }
        };
        if (proxyUrl) {
            requestOptions.proxy = {
                proxyUrl: proxyUrl,
                proxyUsername: tl.getVariable("agent.proxyusername"),
                proxyPassword: tl.getVariable("agent.proxypassword"),
                proxyBypassHosts: tl.getVariable("agent.proxybypasslist") ? JSON.parse(tl.getVariable("agent.proxybypasslist")) : null
            };
        }
        this.httpCallbackClient = new httpClient.HttpClient(tl.getVariable("AZURE_HTTP_USER_AGENT"), null, requestOptions);
        this.channels = [];
    }
    getVersionInfo(versionSpec, vsVersionSpec, packageType, includePreviewVersions) {
        return __awaiter(this, void 0, void 0, function* () {
            var requiredVersionInfo = null;
            if (!this.channels || this.channels.length < 1) {
                yield this.setReleasesIndex();
            }
            let channelInformation = this.getVersionChannel(versionSpec, includePreviewVersions);
            if (channelInformation) {
                requiredVersionInfo = yield this.getVersionFromChannel(channelInformation, versionSpec, vsVersionSpec, packageType, includePreviewVersions);
            }
            if (!!requiredVersionInfo) {
                console.log(tl.loc("MatchingVersionForUserInputVersion", requiredVersionInfo.getVersion(), channelInformation.channelVersion, versionSpec));
            }
            else {
                console.log(tl.loc("MatchingVersionNotFound", packageType, versionSpec));
                if (!versionSpec.endsWith("x")) {
                    console.log(tl.loc("FallingBackToAdjacentChannels", versionSpec));
                    requiredVersionInfo = yield this.getVersionFromOtherChannels(versionSpec, vsVersionSpec, packageType, includePreviewVersions);
                }
            }
            if (!requiredVersionInfo) {
                throw tl.loc("VersionNotFound", packageType, versionSpec);
            }
            let dotNetSdkVersionTelemetry = `{"userVersion":"${versionSpec}", "resolvedVersion":"${requiredVersionInfo.getVersion()}"}`;
            console.log("##vso[telemetry.publish area=TaskDeploymentMethod;feature=UseDotNetV2]" + dotNetSdkVersionTelemetry);
            return requiredVersionInfo;
        });
    }
    getDownloadUrl(versionInfo) {
        console.log(tl.loc("GettingDownloadUrl", versionInfo.getPackageType(), versionInfo.getVersion()));
        this.detectMachineOS();
        let downloadPackageInfoObject = null;
        this.machineOsSuffixes.find((osSuffix) => {
            downloadPackageInfoObject = versionInfo.getFiles().find((downloadPackageInfo) => {
                if (downloadPackageInfo.rid && osSuffix && downloadPackageInfo.rid.toLowerCase() == osSuffix.toLowerCase()) {
                    if ((osSuffix.split("-")[0] == "win" && downloadPackageInfo.name.endsWith(".zip")) || (osSuffix.split("-")[0] != "win" && downloadPackageInfo.name.endsWith("tar.gz"))) {
                        return true;
                    }
                }
                return false;
            });
            return !!downloadPackageInfoObject;
        });
        if (!!downloadPackageInfoObject && downloadPackageInfoObject.url) {
            tl.debug("Got download URL for platform with rid: " + downloadPackageInfoObject.rid);
            return downloadPackageInfoObject.url;
        }
        throw tl.loc("DownloadUrlForMatchingOsNotFound", versionInfo.getPackageType(), versionInfo.getVersion(), this.machineOsSuffixes.toString());
    }
    setReleasesIndex() {
        return this.httpCallbackClient.get(DotNetCoreReleasesIndexUrl)
            .then((response) => {
            return response.readBody();
        })
            .then((body) => {
            let parsedReleasesIndexBody = JSON.parse(body);
            if (!parsedReleasesIndexBody || !parsedReleasesIndexBody["releases-index"] || parsedReleasesIndexBody["releases-index"].length < 1) {
                throw tl.loc("ReleasesIndexBodyIncorrect");
            }
            parsedReleasesIndexBody["releases-index"].forEach(channelRelease => {
                if (channelRelease) {
                    try {
                        this.channels.push(new models_1.Channel(channelRelease));
                    }
                    catch (ex) {
                        tl.debug("Channel information in releases-index.json was not proper. Error: " + ex.message);
                        // do not fail, try to find version in the available channels.
                    }
                }
            });
        })
            .catch((ex) => {
            throw tl.loc("ExceptionWhileDownloadOrReadReleasesIndex", ex.message);
        });
    }
    getVersionChannel(versionSpec, includePreviewVersions) {
        let versionParts = new models_1.VersionParts(versionSpec, this.explicitVersioning);
        let requiredChannelVersion = `${versionParts.majorVersion}.${versionParts.minorVersion}`;
        if (versionParts.minorVersion == "x") {
            var latestChannelVersion = "";
            this.channels.forEach(channel => {
                // Checks if the channel is in preview state, if so then only select the channel if includePreviewVersion should be true.
                // As a channel with state in preview will only have preview releases.
                // example: versionSpec: 3.x Channels: 3.0 (current), 3.1 (preview).
                // if (includePreviewVersion == true) select 3.1
                // else select 3.0
                let satisfiesPreviewCheck = (includePreviewVersions || (!channel.supportPhase || channel.supportPhase.toLowerCase() !== "preview"));
                if (satisfiesPreviewCheck && channel.channelVersion.startsWith(versionParts.majorVersion) && (!latestChannelVersion || utils.compareChannelVersion(channel.channelVersion, latestChannelVersion) > 0)) {
                    latestChannelVersion = channel.channelVersion;
                }
            });
            requiredChannelVersion = latestChannelVersion;
        }
        tl.debug(tl.loc("RequiredChannelVersionForSpec", requiredChannelVersion, versionSpec));
        if (!!requiredChannelVersion) {
            return this.channels.find(channel => {
                if (channel.channelVersion == requiredChannelVersion) {
                    return true;
                }
            });
        }
    }
    getVersionFromChannel(channelInformation, versionSpec, vsVersionSpec, packageType, includePreviewVersions) {
        var releasesJsonUrl = channelInformation.releasesJsonUrl;
        if (releasesJsonUrl) {
            return this.httpCallbackClient.get(releasesJsonUrl)
                .then((response) => {
                return response.readBody();
            })
                .then((body) => {
                var channelReleases = JSON.parse(body).releases;
                let versionInfoList = [];
                channelReleases.forEach((release) => {
                    if (release && packageType === 'sdk' && release.sdks) {
                        try {
                            release.sdks.forEach((sdk) => {
                                let versionInfo = new models_1.VersionInfo(sdk, packageType);
                                if (!versionInfo.getvsVersion() || !vsVersionSpec || (vsVersionSpec == versionInfo.getvsVersion())) {
                                    versionInfoList.push(versionInfo);
                                }
                            });
                        }
                        catch (err) {
                            tl.debug(tl.loc("VersionInformationNotComplete", release[packageType].version, err));
                        }
                    }
                    if (release && release[packageType] && release[packageType].version && !versionInfoList.find((versionInfo) => { return versionInfo.getVersion() === release[packageType].version; })) {
                        try {
                            let versionInfo = new models_1.VersionInfo(release[packageType], packageType);
                            if (!versionInfo.getvsVersion() || !vsVersionSpec || (vsVersionSpec == versionInfo.getvsVersion())) {
                                versionInfoList.push(versionInfo);
                            }
                        }
                        catch (err) {
                            tl.debug(tl.loc("VersionInformationNotComplete", release[packageType].version, err));
                        }
                    }
                });
                return utils.getMatchingVersionFromList(versionInfoList, versionSpec, includePreviewVersions);
            })
                .catch((ex) => {
                tl.error(tl.loc("ErrorWhileGettingVersionFromChannel", versionSpec, channelInformation.channelVersion, ex.message));
                return null;
            });
        }
        else {
            tl.error(tl.loc("UrlForReleaseChannelNotFound", channelInformation.channelVersion));
        }
    }
    getVersionFromOtherChannels(version, vsVersionSpec, packageType, includePreviewVersions) {
        return __awaiter(this, void 0, void 0, function* () {
            let fallbackChannels = this.getChannelsForMajorVersion(version);
            if (!fallbackChannels && fallbackChannels.length < 1) {
                throw tl.loc("NoSuitableChannelWereFound", version);
            }
            var versionInfo = null;
            for (var i = 0; i < fallbackChannels.length; i++) {
                console.log(tl.loc("LookingForVersionInChannel", (fallbackChannels[i]).channelVersion));
                versionInfo = yield this.getVersionFromChannel(fallbackChannels[i], version, vsVersionSpec, packageType, includePreviewVersions);
                if (versionInfo) {
                    break;
                }
            }
            return versionInfo;
        });
    }
    getChannelsForMajorVersion(version) {
        var versionParts = new models_1.VersionParts(version, this.explicitVersioning);
        let adjacentChannels = [];
        this.channels.forEach(channel => {
            if (channel.channelVersion.startsWith(`${versionParts.majorVersion}`)) {
                adjacentChannels.push(channel);
            }
        });
        return adjacentChannels;
    }
    detectMachineOS() {
        if (!this.machineOsSuffixes) {
            let osSuffix = [];
            let scriptRunner;
            try {
                console.log(tl.loc("DetectingPlatform"));
                if (tl.osType().match(/^Win/i)) {
                    let escapedScript = path.join(this.getCurrentDir(), 'externals', 'get-os-platform.ps1').replace(/'/g, "''");
                    let command = `& '${escapedScript}'`;
                    let powershellPath = tl.which('powershell', true);
                    scriptRunner = tl.tool(powershellPath)
                        .line('-NoLogo -Sta -NoProfile -NonInteractive -ExecutionPolicy Unrestricted -Command')
                        .arg(command);
                }
                else {
                    let scriptPath = path.join(this.getCurrentDir(), 'externals', 'get-os-distro.sh');
                    this.setFileAttribute(scriptPath, "755");
                    scriptRunner = tl.tool(tl.which(scriptPath, true));
                }
                let result = scriptRunner.execSync();
                if (result.code != 0) {
                    throw tl.loc("getMachinePlatformFailed", result.error ? result.error.message : result.stderr);
                }
                let output = result.stdout;
                let index;
                if ((index = output.indexOf("Primary:")) >= 0) {
                    let primary = output.substr(index + "Primary:".length).split(os.EOL)[0];
                    osSuffix.push(primary);
                    console.log(tl.loc("PrimaryPlatform", primary));
                }
                if ((index = output.indexOf("Legacy:")) >= 0) {
                    let legacy = output.substr(index + "Legacy:".length).split(os.EOL)[0];
                    osSuffix.push(legacy);
                    console.log(tl.loc("LegacyPlatform", legacy));
                }
                if (osSuffix.length == 0) {
                    throw tl.loc("CouldNotDetectPlatform");
                }
            }
            catch (ex) {
                throw tl.loc("FailedInDetectingMachineArch", ex.message);
            }
            this.machineOsSuffixes = osSuffix;
        }
    }
    setFileAttribute(file, mode) {
        fs.chmodSync(file, mode);
    }
    getCurrentDir() {
        return __dirname;
    }
    getRequestTimeout() {
        let timeout = 60000 * 5;
        const inputValue = tl.getInput('requestTimeout', false);
        if (!(Number.isNaN(Number(inputValue)))) {
            const maxTimeout = 60000 * 10;
            timeout = Math.min(parseInt(inputValue), maxTimeout);
        }
        return timeout;
    }
}
exports.DotNetCoreVersionFetcher = DotNetCoreVersionFetcher;
const DotNetCoreReleasesIndexUrl = "https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/releases-index.json";
