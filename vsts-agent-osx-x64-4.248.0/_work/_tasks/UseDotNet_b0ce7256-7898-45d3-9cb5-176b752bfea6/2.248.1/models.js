"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionParts = exports.Channel = exports.VersionFilesData = exports.VersionInfo = void 0;
const semver = require("semver");
const tl = require("azure-pipelines-task-lib/task");
const utils = require("./versionutilities");
class VersionInfo {
    constructor(versionInfoObject, packageType) {
        if (!versionInfoObject.version || !versionInfoObject.files) {
            throw tl.loc("InvalidVersionObject", packageType, versionInfoObject);
        }
        this.version = versionInfoObject.version;
        this.packageType = packageType;
        this.files = [];
        versionInfoObject.files.forEach(fileData => {
            try {
                this.files.push(new VersionFilesData(fileData));
            }
            catch (ex) {
                tl.debug(tl.loc("FilesDataIsIncorrectInVersion", this.packageType, this.version, ex));
            }
        });
        if (this.packageType == utils.Constants.sdk) {
            this.runtimeVersion = versionInfoObject["runtime-version"] || "";
            this.vsVersion = versionInfoObject["vs-version"] || "";
        }
        else {
            this.runtimeVersion = this.version;
        }
    }
    getVersion() {
        return this.version;
    }
    getFiles() {
        return this.files;
    }
    getRuntimeVersion() {
        return this.runtimeVersion;
    }
    getPackageType() {
        return this.packageType;
    }
    getvsVersion() {
        return this.vsVersion;
    }
}
exports.VersionInfo = VersionInfo;
class VersionFilesData {
    constructor(versionFilesData) {
        if (!versionFilesData || !versionFilesData.name || !versionFilesData.url || !versionFilesData.rid) {
            throw tl.loc("VersionFilesDataIncorrect");
        }
        this.name = versionFilesData.name;
        this.url = versionFilesData.url;
        this.rid = versionFilesData.rid;
        this.hash = versionFilesData.hash;
    }
}
exports.VersionFilesData = VersionFilesData;
class Channel {
    constructor(channelRelease) {
        if (!channelRelease || !channelRelease["channel-version"] || !channelRelease["releases.json"]) {
            throw tl.loc("InvalidChannelObject");
        }
        this.channelVersion = channelRelease["channel-version"];
        this.releasesJsonUrl = channelRelease["releases.json"];
        if (!channelRelease["support-phase"]) {
            tl.debug(tl.loc("SupportPhaseNotPresentInChannel", this.channelVersion));
        }
        else {
            this.supportPhase = channelRelease["support-phase"];
        }
    }
}
exports.Channel = Channel;
class VersionParts {
    constructor(version, explicitVersion = false) {
        if (explicitVersion) {
            VersionParts.ValidateExplicitVersionNumber(version);
        }
        else {
            VersionParts.ValidateVersionSpec(version);
        }
        this.versionSpec = version;
        let parts = version.split(".");
        this.majorVersion = parts[0];
        this.minorVersion = parts[1];
        this.patchVersion = "";
        if (this.minorVersion != "x") {
            this.patchVersion = parts[2];
        }
    }
    /**
     * Validate the version if this string is a explicit version number. Returns an exception if the version number is not explicit.
     * @param version the input version number as string
     */
    static ValidateExplicitVersionNumber(version) {
        try {
            let parts = version.split('.');
            // validate version
            if ((parts.length < 3) || // check if the version has at least 3 parts
                !parts[0] || // The major version must always be set
                !parts[1] || // The minor version must always be set
                !parts[2] || // The patch version must always be set
                Number.isNaN(Number.parseInt(parts[0])) || // the major version number must be a number
                Number.isNaN(Number.parseInt(parts[1])) || // the minor version number must be a number
                Number.isNaN(Number.parseInt(parts[2].split(/\-|\+/)[0])) // the patch version number must be a number. (the patch version can have a '-', or a '+' because of version numbers like: 1.0.0-beta-50)
            ) {
                throw tl.loc("OnlyExplicitVersionAllowed", version);
            }
            if (!semver.valid(version)) {
                throw tl.loc("InvalidVersion", version);
            }
        }
        catch (ex) {
            throw tl.loc("VersionNotAllowed", version, ex);
        }
    }
    /**
     * Validate the version. Returns an exception if the version number is wrong.
     * @param version the input version number as string
     */
    static ValidateVersionSpec(version) {
        try {
            let parts = version.split('.');
            // validate version
            if (parts.length < 2 || // check if the version has at least 3 parts
                (parts[1] == "x" && parts.length > 2) || // a version number like `1.x` must have only major and minor version
                (parts[1] != "x" && parts.length <= 2) || // a version number like `1.1` must have a patch version
                !parts[0] || // The major version must always be set
                !parts[1] || // The minor version must always be set
                (parts.length == 3 && !parts[2]) || // a version number like `1.1.` is invalid because the patch version is missing
                Number.isNaN(Number.parseInt(parts[0])) || // the major version number must be a number
                (parts[1] != "x" && // if the minor version is not `x`
                    (Number.isNaN(Number.parseInt(parts[1])) || // the minor version number must be a number
                        (parts.length > 2 && parts[2] != "x" && // if the patch is not `x`, then its an explicit version
                            !semver.valid(version) // validate the explicit version
                        )))) {
                throw tl.loc("VersionNumberHasTheWrongFormat", version);
            }
            new semver.Range(version);
        }
        catch (ex) {
            throw tl.loc("VersionNotAllowed", version, ex);
        }
    }
}
exports.VersionParts = VersionParts;
