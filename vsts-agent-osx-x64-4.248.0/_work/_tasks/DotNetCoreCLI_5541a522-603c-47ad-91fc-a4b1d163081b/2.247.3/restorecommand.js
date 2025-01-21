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
exports.run = void 0;
const tl = require("azure-pipelines-task-lib/task");
const utility = require("./Common/utility");
const auth = require("azure-pipelines-tasks-packaging-common/nuget/Authentication");
const NuGetConfigHelper2_1 = require("azure-pipelines-tasks-packaging-common/nuget/NuGetConfigHelper2");
const ngRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const path = require("path");
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const commandHelper = require("azure-pipelines-tasks-packaging-common/nuget/CommandHelper");
const pkgLocationUtils = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const util_1 = require("azure-pipelines-tasks-packaging-common/util");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(tl.loc('DeprecatedDotnet2_2_And_3_0'));
        let packagingLocation;
        try {
            const timeout = utility.getRequestTimeout();
            const webApiOptions = {
                socketTimeout: timeout,
                globalAgentOptions: {
                    timeout: timeout,
                }
            };
            packagingLocation = yield pkgLocationUtils.getPackagingUris(pkgLocationUtils.ProtocolType.NuGet, webApiOptions);
        }
        catch (error) {
            tl.debug('Unable to get packaging URIs');
            (0, util_1.logError)(error);
            throw error;
        }
        const buildIdentityDisplayName = null;
        const buildIdentityAccount = null;
        try {
            const projectSearch = tl.getDelimitedInput('projects', '\n', false);
            // if no projectSearch strings are given, use "" to operate on the current directory
            const projectFiles = utility.getProjectFiles(projectSearch);
            if (projectFiles.length === 0) {
                tl.setResult(tl.TaskResult.Failed, tl.loc('Info_NoFilesMatchedTheSearchPattern'));
                return;
            }
            const noCache = tl.getBoolInput('noCache');
            const verbosity = tl.getInput('verbosityRestore');
            let packagesDirectory = tl.getPathInput('packagesDirectory');
            if (!tl.filePathSupplied('packagesDirectory')) {
                packagesDirectory = null;
            }
            // Setting up auth-related variables
            tl.debug('Setting up auth');
            const serviceUri = tl.getEndpointUrl('SYSTEMVSSCONNECTION', false);
            let urlPrefixes = packagingLocation.PackagingUris;
            tl.debug(`Discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            const testPrefixes = tl.getVariable('DotNetCoreCLITask.ExtraUrlPrefixesForTesting');
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(';'));
                tl.debug(`All URL prefixes: ${urlPrefixes}`);
            }
            const accessToken = pkgLocationUtils.getSystemAccessToken();
            const externalAuthArr = commandHelper.GetExternalAuthInfoArray('externalEndpoints');
            const authInfo = new auth.NuGetExtendedAuthInfo(new auth.InternalAuthInfo(urlPrefixes, accessToken, /*useCredProvider*/ null, /*useCredConfig*/ true), externalAuthArr);
            // Setting up sources, either from provided config file or from feed selection
            tl.debug('Setting up sources');
            let nuGetConfigPath = undefined;
            const selectOrConfig = tl.getInput('selectOrConfig');
            // This IF is here in order to provide a value to nuGetConfigPath (if option selected, if user provided it)
            // and then pass it into the config helper
            if (selectOrConfig === 'config') {
                nuGetConfigPath = tl.getPathInput('nugetConfigPath', false, true);
                if (!tl.filePathSupplied('nugetConfigPath')) {
                    nuGetConfigPath = undefined;
                }
            }
            // If there was no nuGetConfigPath, NuGetConfigHelper will create one
            const nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(null, nuGetConfigPath, authInfo, { credProviderFolder: null, extensionsDisabled: true }, null /* tempConfigPath */, false /* useNugetToModifyConfigFile */);
            let credCleanup = () => {
                if (tl.exist(nuGetConfigHelper.tempNugetConfigPath)) {
                    tl.rmRF(nuGetConfigHelper.tempNugetConfigPath);
                }
            };
            let isNugetOrgBehaviorWarn = false;
            // Now that the NuGetConfigHelper was initialized with all the known information we can proceed
            // and check if the user picked the 'select' option to fill out the config file if needed
            if (selectOrConfig === 'select') {
                const sources = new Array();
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedRestore');
                if (feed.feedId) {
                    const feedUrl = yield nutil.getNuGetFeedRegistryUrl(packagingLocation.DefaultPackagingUri, feed.feedId, feed.projectId, null, accessToken);
                    sources.push({
                        feedName: feed.feedId,
                        feedUri: feedUrl,
                        isInternal: true
                    });
                }
                const includeNuGetOrg = tl.getBoolInput('includeNuGetOrg', false);
                if (includeNuGetOrg) {
                    // If includeNuGetOrg is true, check the INCLUDE_NUGETORG_BEHAVIOR env variable to determine task result 
                    // this allows compliance checks to warn or break the task if consuming from nuget.org directly 
                    const nugetOrgBehavior = includeNuGetOrg ? tl.getVariable("INCLUDE_NUGETORG_BEHAVIOR") : undefined;
                    tl.debug(`NugetOrgBehavior: ${nugetOrgBehavior}`);
                    if ((nugetOrgBehavior === null || nugetOrgBehavior === void 0 ? void 0 : nugetOrgBehavior.toLowerCase()) == "fail") {
                        throw new Error(tl.loc("Error_IncludeNuGetOrgEnabled"));
                    }
                    else if ((nugetOrgBehavior === null || nugetOrgBehavior === void 0 ? void 0 : nugetOrgBehavior.toLowerCase()) == "warn") {
                        isNugetOrgBehaviorWarn = true;
                    }
                    sources.push(auth.NuGetOrgV3PackageSource);
                }
                // Creating NuGet.config for the user
                if (sources.length > 0) {
                    tl.debug(`Adding the following sources to the config file: ${sources.map(x => x.feedName).join(';')}`);
                    nuGetConfigHelper.addSourcesToTempNuGetConfig(sources);
                    nuGetConfigPath = nuGetConfigHelper.tempNugetConfigPath;
                }
                else {
                    tl.debug('No sources were added to the temp NuGet.config file');
                }
            }
            // Setting creds in the temp NuGet.config if needed
            nuGetConfigHelper.setAuthForSourcesInTempNuGetConfig();
            const configFile = nuGetConfigHelper.tempNugetConfigPath;
            nuGetConfigHelper.backupExistingRootNuGetFiles();
            const dotnetPath = tl.which('dotnet', true);
            try {
                const additionalRestoreArguments = tl.getInput('restoreArguments', false);
                for (const projectFile of projectFiles) {
                    yield dotNetRestoreAsync(dotnetPath, projectFile, packagesDirectory, configFile, noCache, verbosity, additionalRestoreArguments);
                }
            }
            finally {
                credCleanup();
                nuGetConfigHelper.restoreBackupRootNuGetFiles();
            }
            isNugetOrgBehaviorWarn
                ? tl.setResult(tl.TaskResult.SucceededWithIssues, tl.loc("Warning_IncludeNuGetOrgEnabled"))
                : tl.setResult(tl.TaskResult.Succeeded, tl.loc("PackagesInstalledSuccessfully"));
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc('BuildIdentityPermissionsHint', buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, tl.loc('PackagesFailedToInstall'));
        }
    });
}
exports.run = run;
function dotNetRestoreAsync(dotnetPath, projectFile, packagesDirectory, configFile, noCache, verbosity, additionalRestoreArguments) {
    const dotnet = tl.tool(dotnetPath);
    dotnet.arg('restore');
    if (projectFile) {
        dotnet.arg(projectFile);
    }
    if (packagesDirectory) {
        dotnet.arg('--packages');
        dotnet.arg(packagesDirectory);
    }
    dotnet.arg('--configfile');
    dotnet.arg(configFile);
    if (noCache) {
        dotnet.arg('--no-cache');
    }
    if (verbosity && verbosity !== '-') {
        dotnet.arg('--verbosity');
        dotnet.arg(verbosity);
    }
    if (additionalRestoreArguments) {
        dotnet.line(additionalRestoreArguments);
    }
    const envWithProxy = ngRunner.setNuGetProxyEnvironment(process.env, configFile, null);
    return dotnet.exec({ cwd: path.dirname(projectFile), env: envWithProxy });
}
