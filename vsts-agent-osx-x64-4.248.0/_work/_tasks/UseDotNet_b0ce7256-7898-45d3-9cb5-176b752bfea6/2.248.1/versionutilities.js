"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = exports.getMatchingVersionFromList = exports.compareChannelVersion = exports.versionCompareFunction = void 0;
const path = require("path");
const semver = require("semver");
const tl = require("azure-pipelines-task-lib/task");
const toolLib = require("azure-pipelines-tool-lib");
function versionCompareFunction(versionA, versionB) {
    if (!toolLib.isExplicitVersion(versionA) || !toolLib.isExplicitVersion(versionB)) {
        throw tl.loc("VersionsCanNotBeCompared", versionA, versionB);
    }
    return semver.compare(versionA, versionB);
}
exports.versionCompareFunction = versionCompareFunction;
function compareChannelVersion(channelVersionA, channelVersionB) {
    if (!channelVersionA || !channelVersionB) {
        throw "One channel version is missing";
    }
    let channelVersionAParts = channelVersionA.split(".");
    let channelVersionBParts = channelVersionB.split(".");
    if (channelVersionAParts.length != 2 || channelVersionBParts.length != 2) {
        throw tl.loc("ChannelVersionsNotComparable", channelVersionA, channelVersionB);
    }
    let channelAMajorVersion = Number.parseInt(channelVersionAParts[0]);
    let channelAMinorVersion = Number.parseInt(channelVersionAParts[1]);
    let channelBMajorVersion = Number.parseInt(channelVersionBParts[0]);
    let channelBMinorVersion = Number.parseInt(channelVersionBParts[1]);
    if (Number.isNaN(channelAMajorVersion) || Number.isNaN(channelAMinorVersion) || Number.isNaN(channelBMajorVersion) || Number.isNaN(channelBMinorVersion)) {
        throw tl.loc("ChannelVersionsNotComparable", channelVersionA, channelVersionB);
    }
    if (channelAMajorVersion != channelBMajorVersion) {
        return channelAMajorVersion > channelBMajorVersion ? 1 : -1;
    }
    else if (channelAMinorVersion != channelBMinorVersion) {
        return channelAMinorVersion > channelBMinorVersion ? 1 : -1;
    }
    return 0;
}
exports.compareChannelVersion = compareChannelVersion;
function getMatchingVersionFromList(versionInfoList, versionSpec, includePreviewVersions = false) {
    let versionList = [];
    versionInfoList.forEach(versionInfo => {
        if (versionInfo && versionInfo.getVersion()) {
            versionList.push(versionInfo.getVersion());
        }
    });
    if (versionList.length > 0) {
        let matchedVersion = semver.maxSatisfying(versionList, versionSpec, { includePrerelease: includePreviewVersions });
        if (matchedVersion) {
            return versionInfoList.find(versionInfo => {
                return versionInfo.getVersion() == matchedVersion;
            });
        }
    }
    return null;
}
exports.getMatchingVersionFromList = getMatchingVersionFromList;
exports.Constants = {
    "sdk": "sdk",
    "runtime": "runtime",
    "relativeRuntimePath": path.join("shared", "Microsoft.NETCore.App"),
    "relativeSdkPath": "sdk",
    "relativeGlobalToolPath": path.join(".dotnet", "tools")
};
