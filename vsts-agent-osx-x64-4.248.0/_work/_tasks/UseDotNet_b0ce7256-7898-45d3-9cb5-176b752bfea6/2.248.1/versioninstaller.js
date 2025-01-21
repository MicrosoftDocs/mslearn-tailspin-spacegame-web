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
exports.VersionInstaller = void 0;
const path = require("path");
const fs = require("fs");
const url = require("url");
const tl = require("azure-pipelines-task-lib/task");
const toolLib = require("azure-pipelines-tool-lib/tool");
const utils = require("./versionutilities");
const tinyGuidUtility_1 = require("azure-pipelines-tasks-utility-common/tinyGuidUtility");
class VersionInstaller {
    constructor(packageType, installationPath) {
        try {
            tl.exist(installationPath) || tl.mkdirP(installationPath);
        }
        catch (ex) {
            throw tl.loc("UnableToAccessPath", installationPath, ex.message);
        }
        this.packageType = packageType;
        this.installationPath = installationPath;
    }
    /**
     * Install a single version from a versionInfo
     * @param versionInfo the versionInfo object with all information from the version
     * @param downloadUrl The download url of the sdk / runtime.
     */
    downloadAndInstall(versionInfo, downloadUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!versionInfo || !versionInfo.getVersion() || !downloadUrl || !url.parse(downloadUrl)) {
                throw tl.loc("VersionCanNotBeDownloadedFromUrl", versionInfo, downloadUrl);
            }
            let version = versionInfo.getVersion();
            try {
                try {
                    var downloadPath = yield toolLib.downloadToolWithRetries(downloadUrl);
                }
                catch (ex) {
                    tl.warning(tl.loc("CouldNotDownload", downloadUrl, ex));
                    let fallBackUrl = `https://dotnetcli.azureedge.net/dotnet/${this.packageType === "runtime" ? "Runtime" : "Sdk"}/${version}/${downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1)}`;
                    console.log("Using fallback url for download: " + fallBackUrl);
                    var downloadPath = yield toolLib.downloadToolWithRetries(fallBackUrl);
                }
                // Extract
                console.log(tl.loc("ExtractingPackage", downloadPath));
                try {
                    let tempDirectory = tl.getVariable('Agent.TempDirectory');
                    let extDirectory = path.join(tempDirectory, (0, tinyGuidUtility_1.tinyGuid)());
                    var extPath = tl.osType().match(/^Win/) ? yield toolLib.extractZip(downloadPath, extDirectory) : yield toolLib.extractTar(downloadPath);
                }
                catch (ex) {
                    throw tl.loc("FailedWhileExtractingPacakge", ex);
                }
                // Copy folders
                tl.debug(tl.loc("CopyingFoldersIntoPath", this.installationPath));
                var allRootLevelEnteriesInDir = tl.ls("", [extPath]).map(name => path.join(extPath, name));
                var directoriesTobeCopied = allRootLevelEnteriesInDir.filter(path => fs.lstatSync(path).isDirectory());
                directoriesTobeCopied.forEach((directoryPath) => {
                    tl.cp(directoryPath, this.installationPath, "-rf", false);
                });
                // Copy files
                try {
                    if (this.packageType == utils.Constants.sdk && this.isLatestInstalledVersion(version)) {
                        tl.debug(tl.loc("CopyingFilesIntoPath", this.installationPath));
                        var filesToBeCopied = allRootLevelEnteriesInDir.filter(path => !fs.lstatSync(path).isDirectory());
                        filesToBeCopied.forEach((filePath) => {
                            tl.cp(filePath, this.installationPath, "-f", false);
                        });
                    }
                }
                catch (ex) {
                    tl.warning(tl.loc("FailedToCopyTopLevelFiles", this.installationPath, ex));
                }
                // Cache tool
                this.createInstallationCompleteFile(versionInfo);
                console.log(tl.loc("SuccessfullyInstalled", this.packageType, version));
            }
            catch (ex) {
                throw tl.loc("FailedWhileInstallingVersionAtPath", version, this.installationPath, ex);
            }
        });
    }
    /**
     * This checks if an explicit version is installed.
     * This doesn't work with a search pattern like 1.0.x.
     * @param version An explicit version. Like 1.0.1
     */
    isVersionInstalled(version) {
        if (!toolLib.isExplicitVersion(version)) {
            throw tl.loc("ExplicitVersionRequired", version);
        }
        var isInstalled = false;
        if (this.packageType == utils.Constants.sdk) {
            isInstalled = tl.exist(path.join(this.installationPath, utils.Constants.relativeSdkPath, version)) && tl.exist(path.join(this.installationPath, utils.Constants.relativeSdkPath, `${version}.complete`));
        }
        else {
            isInstalled = tl.exist(path.join(this.installationPath, utils.Constants.relativeRuntimePath, version)) && tl.exist(path.join(this.installationPath, utils.Constants.relativeRuntimePath, `${version}.complete`));
        }
        isInstalled ? console.log(tl.loc("VersionFoundInCache", version)) : console.log(tl.loc("VersionNotFoundInCache", version));
        return isInstalled;
    }
    createInstallationCompleteFile(versionInfo) {
        tl.debug(tl.loc("CreatingInstallationCompeleteFile", versionInfo.getVersion(), this.packageType));
        // always add for runtime as it is installed with sdk as well.
        var pathToVersionCompleteFile = "";
        if (this.packageType == utils.Constants.sdk) {
            let sdkVersion = versionInfo.getVersion();
            pathToVersionCompleteFile = path.join(this.installationPath, utils.Constants.relativeSdkPath, `${sdkVersion}.complete`);
            tl.writeFile(pathToVersionCompleteFile, `{ "version": "${sdkVersion}" }`);
        }
        let runtimeVersion = versionInfo.getRuntimeVersion();
        if (runtimeVersion) {
            pathToVersionCompleteFile = path.join(this.installationPath, utils.Constants.relativeRuntimePath, `${runtimeVersion}.complete`);
            tl.writeFile(pathToVersionCompleteFile, `{ "version": "${runtimeVersion}" }`);
        }
        else if (this.packageType == utils.Constants.runtime) {
            throw tl.loc("CannotFindRuntimeVersionForCompletingInstallation", this.packageType, versionInfo.getVersion());
        }
    }
    isLatestInstalledVersion(version) {
        var pathTobeChecked = this.packageType == utils.Constants.sdk ? path.join(this.installationPath, utils.Constants.relativeSdkPath) : path.join(this.installationPath, utils.Constants.relativeRuntimePath);
        if (!tl.exist(pathTobeChecked)) {
            throw tl.loc("PathNotFoundException", pathTobeChecked);
        }
        var allEnteries = tl.ls("", [pathTobeChecked]).map(name => path.join(pathTobeChecked, name));
        var folderPaths = allEnteries.filter(element => fs.lstatSync(element).isDirectory());
        var isLatest = folderPaths.findIndex(folderPath => {
            try {
                let versionFolderName = path.basename(folderPath);
                tl.debug(tl.loc("ComparingInstalledFolderVersions", version, versionFolderName));
                return utils.versionCompareFunction(versionFolderName, version) > 0;
            }
            catch (ex) {
                // no op, folder name might not be in version format
            }
        }) < 0;
        var filePaths = allEnteries.filter(element => !fs.lstatSync(element).isDirectory());
        isLatest = isLatest && filePaths.findIndex(filePath => {
            try {
                var versionCompleteFileName = this.getVersionCompleteFileName(path.basename(filePath));
                tl.debug(tl.loc("ComparingInstalledFileVersions", version, versionCompleteFileName));
                return utils.versionCompareFunction(versionCompleteFileName, version) > 0;
            }
            catch (ex) {
                // no op, file name might not be in version format
            }
        }) < 0;
        isLatest ? tl.debug(tl.loc("VersionIsLocalLatest", version, this.installationPath)) : tl.debug(tl.loc("VersionIsNotLocalLatest", version, this.installationPath));
        return isLatest;
    }
    getVersionCompleteFileName(name) {
        if (name && name.endsWith(".complete")) {
            var parts = name.split('.');
            var fileNameWithoutExtensionLength = name.length - (parts[parts.length - 1].length + 1);
            if (fileNameWithoutExtensionLength > 0) {
                return name.substr(0, fileNameWithoutExtensionLength);
            }
        }
        throw tl.loc("FileNameNotCorrectCompleteFileName", name);
    }
}
exports.VersionInstaller = VersionInstaller;
