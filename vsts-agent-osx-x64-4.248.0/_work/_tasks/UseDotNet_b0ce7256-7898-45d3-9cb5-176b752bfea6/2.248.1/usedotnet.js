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
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const versionfetcher_1 = require("./versionfetcher");
const globaljsonfetcher_1 = require("./globaljsonfetcher");
const versioninstaller_1 = require("./versioninstaller");
const versionutilities_1 = require("./versionutilities");
const models_1 = require("./models");
const nugetinstaller_1 = require("./nugetinstaller");
function checkVersionForDeprecationAndNotify(versionSpec) {
    if (versionSpec != null && versionSpec.startsWith("2.1")) {
        tl.warning(tl.loc('DepricatedVersionNetCore', versionSpec));
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let useGlobalJson = tl.getBoolInput('useGlobalJson');
        let packageType = (tl.getInput('packageType') || "sdk").toLowerCase();
        ;
        let versionSpec = tl.getInput('version');
        let vsVersionSpec = tl.getInput('vsVersion');
        const nugetVersion = tl.getInput('nugetVersion') || '4.9.6';
        let installationPath = tl.getInput('installationPath');
        if (!installationPath || installationPath.length == 0) {
            installationPath = path.join(tl.getVariable('Agent.ToolsDirectory'), "dotnet");
        }
        let performMultiLevelLookup = tl.getBoolInput("performMultiLevelLookup", false);
        // Check if we want install dotnet
        if (versionSpec || (useGlobalJson && packageType == "sdk")) {
            let includePreviewVersions = tl.getBoolInput('includePreviewVersions');
            let workingDirectory = tl.getPathInput("workingDirectory", false) || null;
            yield installDotNet(installationPath, packageType, versionSpec, vsVersionSpec, useGlobalJson, workingDirectory, includePreviewVersions);
            tl.prependPath(installationPath);
            // Set DOTNET_ROOT for dotnet core Apphost to find runtime since it is installed to a non well-known location.
            tl.setVariable('DOTNET_ROOT', installationPath);
            // By default disable Multi Level Lookup unless user wants it enabled.
            tl.setVariable("DOTNET_MULTILEVEL_LOOKUP", !performMultiLevelLookup ? "0" : "1");
        }
        // Add dot net tools path to "PATH" environment variables, so that tools can be used directly.
        addDotNetCoreToolPath();
        // Install NuGet version specified by user or 4.9.6 in case none is specified
        // Also sets up the proxy configuration settings.
        yield nugetinstaller_1.NuGetInstaller.installNuGet(nugetVersion);
    });
}
/**
 * install dotnet to the installation path.
 * @param installationPath The installation path. If this is empty it would use {Agent.ToolsDirectory}/dotnet/
 * @param packageType The installation type for the installation. Only `sdk` and `runtime` are valid options
 * @param versionSpec The version the user want to install.
 * @param useGlobalJson A switch so we know if the user have `global.json` files and want use that. If this is true only SDK is possible!
 * @param workingDirectory This is only relevant if the `useGlobalJson` switch is `true`. It will set the root directory for the search of `global.json`
 * @param includePreviewVersions Define if the installer also search for preview version
 */
function installDotNet(installationPath, packageType, versionSpec, vsVersionSpec, useGlobalJson, workingDirectory, includePreviewVersions) {
    return __awaiter(this, void 0, void 0, function* () {
        let versionFetcher = new versionfetcher_1.DotNetCoreVersionFetcher();
        let dotNetCoreInstaller = new versioninstaller_1.VersionInstaller(packageType, installationPath);
        // here we must check also the package type because if the user switch the packageType the useGlobalJson can be true, also if it will hidden.
        if (useGlobalJson && packageType == "sdk") {
            let globalJsonFetcherInstance = new globaljsonfetcher_1.globalJsonFetcher(workingDirectory);
            let versionsToInstall = yield globalJsonFetcherInstance.GetVersions();
            for (let index = 0; index < versionsToInstall.length; index++) {
                const version = versionsToInstall[index];
                let url = versionFetcher.getDownloadUrl(version);
                if (!dotNetCoreInstaller.isVersionInstalled(version.getVersion())) {
                    yield dotNetCoreInstaller.downloadAndInstall(version, url);
                }
                else {
                    checkVersionForDeprecationAndNotify(versionSpec);
                }
            }
        }
        else if (versionSpec) {
            console.log(tl.loc("ToolToInstall", packageType, versionSpec));
            let versionSpecParts = new models_1.VersionParts(versionSpec);
            let versionInfo = yield versionFetcher.getVersionInfo(versionSpecParts.versionSpec, vsVersionSpec, packageType, includePreviewVersions);
            if (!versionInfo) {
                throw tl.loc("MatchingVersionNotFound", versionSpecParts.versionSpec);
            }
            if (!dotNetCoreInstaller.isVersionInstalled(versionInfo.getVersion())) {
                yield dotNetCoreInstaller.downloadAndInstall(versionInfo, versionFetcher.getDownloadUrl(versionInfo));
            }
            else {
                checkVersionForDeprecationAndNotify(versionSpec);
            }
        }
        else {
            throw new Error("Hey developer you have called the method `installDotNet` without a `versionSpec` or without `useGlobalJson`. that is impossible.");
        }
    });
}
function addDotNetCoreToolPath() {
    try {
        let globalToolPath = "";
        if (tl.osType().match(/^Win/)) {
            globalToolPath = path.join(process.env.USERPROFILE, versionutilities_1.Constants.relativeGlobalToolPath);
        }
        else {
            globalToolPath = path.join(process.env.HOME, versionutilities_1.Constants.relativeGlobalToolPath);
        }
        console.log(tl.loc("PrependGlobalToolPath"));
        tl.mkdirP(globalToolPath);
        tl.prependPath(globalToolPath);
    }
    catch (error) {
        //nop
        console.log(tl.loc("ErrorWhileSettingDotNetToolPath", error.message));
    }
}
const taskManifestPath = path.join(__dirname, "task.json");
const packagingCommonManifestPath = path.join(__dirname, "node_modules/azure-pipelines-tasks-packaging-common/module.json");
tl.debug("Setting resource path to " + taskManifestPath);
tl.setResourcePath(taskManifestPath);
tl.setResourcePath(packagingCommonManifestPath);
run()
    .then(() => tl.setResult(tl.TaskResult.Succeeded, ""))
    .catch((error) => tl.setResult(tl.TaskResult.Failed, !!error.message ? error.message : error));
