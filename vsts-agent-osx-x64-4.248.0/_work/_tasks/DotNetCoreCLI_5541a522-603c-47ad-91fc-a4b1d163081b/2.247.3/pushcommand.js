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
const auth = require("azure-pipelines-tasks-packaging-common/nuget/Authentication");
const commandHelper = require("azure-pipelines-tasks-packaging-common/nuget/CommandHelper");
const nutil = require("azure-pipelines-tasks-packaging-common/nuget/Utility");
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const NuGetConfigHelper2_1 = require("azure-pipelines-tasks-packaging-common/nuget/NuGetConfigHelper2");
const ngRunner = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolRunner2");
const pkgLocationUtils = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const util_1 = require("azure-pipelines-tasks-packaging-common/util");
const restutilities_1 = require("azure-pipelines-tasks-utility-common/restutilities");
const utility_1 = require("./Common/utility");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let packagingLocation;
        try {
            const timeout = (0, utility_1.getRequestTimeout)();
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
            // Get list of files to publish
            const searchPatternInput = tl.getPathInput('searchPatternPush', true, false);
            const findOptions = {};
            const matchOptions = {};
            const searchPatterns = nutil.getPatternsArrayFromInput(searchPatternInput);
            const filesList = tl.findMatch(undefined, searchPatterns, findOptions, matchOptions);
            filesList.forEach(packageFile => {
                if (!tl.stats(packageFile).isFile()) {
                    throw new Error(tl.loc('Error_PushNotARegularFile', packageFile));
                }
            });
            if (filesList.length < 1) {
                tl.setResult(tl.TaskResult.Failed, tl.loc('Info_NoPackagesMatchedTheSearchPattern'));
                return;
            }
            // Get the info the type of feed
            let nugetFeedType = tl.getInput('nuGetFeedType') || 'internal';
            // Make sure the feed type is an expected one
            const normalizedNuGetFeedType = ['internal', 'external'].find(x => nugetFeedType.toUpperCase() === x.toUpperCase());
            if (!normalizedNuGetFeedType) {
                throw new Error(tl.loc('UnknownFeedType', nugetFeedType));
            }
            nugetFeedType = normalizedNuGetFeedType;
            const serviceUri = tl.getEndpointUrl('SYSTEMVSSCONNECTION', false);
            let urlPrefixes = packagingLocation.PackagingUris;
            tl.debug(`discovered URL prefixes: ${urlPrefixes}`);
            // Note to readers: This variable will be going away once we have a fix for the location service for
            // customers behind proxies
            const testPrefixes = tl.getVariable('DotNetCoreCLITask.ExtraUrlPrefixesForTesting');
            if (testPrefixes) {
                urlPrefixes = urlPrefixes.concat(testPrefixes.split(';'));
                tl.debug(`all URL prefixes: ${urlPrefixes}`);
            }
            // Setting up auth info
            let accessToken;
            const isInternalFeed = nugetFeedType === 'internal';
            accessToken = yield getAccessToken(isInternalFeed, urlPrefixes);
            const internalAuthInfo = new auth.InternalAuthInfo(urlPrefixes, accessToken, /*useCredProvider*/ null, true);
            let configFile = null;
            let apiKey;
            // dotnet nuget push does not currently accept a --config-file parameter
            // so we are going to work around this by creating a temporary working directory for dotnet with
            // a nuget config file it will load by default.
            const tempNuGetConfigDirectory = path.join(NuGetConfigHelper2_1.NuGetConfigHelper2.getTempNuGetConfigBasePath(), 'NuGet_' + tl.getVariable('build.buildId'));
            const tempNuGetPath = path.join(tempNuGetConfigDirectory, 'nuget.config');
            tl.mkdirP(tempNuGetConfigDirectory);
            let credCleanup = () => {
                if (tl.exist(tempNuGetConfigDirectory)) {
                    tl.rmRF(tempNuGetConfigDirectory);
                }
            };
            let feedUri = undefined;
            let authInfo;
            let nuGetConfigHelper;
            if (isInternalFeed) {
                authInfo = new auth.NuGetExtendedAuthInfo(internalAuthInfo);
                nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(null, null, /* nugetConfigPath */ authInfo, { credProviderFolder: null, extensionsDisabled: true }, tempNuGetPath, false /* useNugetToModifyConfigFile */);
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedPublish');
                feedUri = yield nutil.getNuGetFeedRegistryUrl(packagingLocation.DefaultPackagingUri, feed.feedId, feed.projectId, null, accessToken, /* useSession */ true);
                nuGetConfigHelper.addSourcesToTempNuGetConfig([{ feedName: feed.feedId, feedUri: feedUri, isInternal: true }]);
                configFile = nuGetConfigHelper.tempNugetConfigPath;
                apiKey = 'VSTS';
            }
            else {
                const externalAuthArr = commandHelper.GetExternalAuthInfoArray('externalEndpoint');
                authInfo = new auth.NuGetExtendedAuthInfo(internalAuthInfo, externalAuthArr);
                nuGetConfigHelper = new NuGetConfigHelper2_1.NuGetConfigHelper2(null, null, /* nugetConfigPath */ authInfo, { credProviderFolder: null, extensionsDisabled: true }, tempNuGetPath, false /* useNugetToModifyConfigFile */);
                const externalAuth = externalAuthArr[0];
                if (!externalAuth) {
                    tl.setResult(tl.TaskResult.Failed, tl.loc('Error_NoSourceSpecifiedForPush'));
                    return;
                }
                nuGetConfigHelper.addSourcesToTempNuGetConfig([externalAuth.packageSource]);
                feedUri = externalAuth.packageSource.feedUri;
                configFile = nuGetConfigHelper.tempNugetConfigPath;
                const authType = externalAuth.authType;
                switch (authType) {
                    case (auth.ExternalAuthType.UsernamePassword):
                    case (auth.ExternalAuthType.Token):
                        apiKey = 'RequiredApiKey';
                        break;
                    case (auth.ExternalAuthType.ApiKey):
                        const apiKeyAuthInfo = externalAuth;
                        apiKey = apiKeyAuthInfo.apiKey;
                        break;
                    default:
                        break;
                }
            }
            // Setting creds in the temp NuGet.config if needed
            nuGetConfigHelper.setAuthForSourcesInTempNuGetConfig();
            const dotnetPath = tl.which('dotnet', true);
            try {
                for (const packageFile of filesList) {
                    yield dotNetNuGetPushAsync(dotnetPath, packageFile, feedUri, apiKey, configFile, tempNuGetConfigDirectory);
                }
            }
            finally {
                credCleanup();
            }
            tl.setResult(tl.TaskResult.Succeeded, tl.loc('PackagesPublishedSuccessfully'));
        }
        catch (err) {
            tl.error(err);
            if (buildIdentityDisplayName || buildIdentityAccount) {
                tl.warning(tl.loc('BuildIdentityPermissionsHint', buildIdentityDisplayName, buildIdentityAccount));
            }
            tl.setResult(tl.TaskResult.Failed, tl.loc('PackagesFailedToPublish'));
        }
    });
}
exports.run = run;
function dotNetNuGetPushAsync(dotnetPath, packageFile, feedUri, apiKey, configFile, workingDirectory) {
    const dotnet = tl.tool(dotnetPath);
    dotnet.arg('nuget');
    dotnet.arg('push');
    dotnet.arg(packageFile);
    dotnet.arg('--source');
    dotnet.arg(feedUri);
    dotnet.arg('--api-key');
    dotnet.arg(apiKey);
    // dotnet.exe v1 and v2 do not accept the --verbosity parameter for the "nuget push"" command, although it does for other commands
    const envWithProxy = ngRunner.setNuGetProxyEnvironment(process.env, /*configFile*/ null, feedUri);
    return dotnet.exec({ cwd: workingDirectory, env: envWithProxy });
}
function getAccessToken(isInternalFeed, uriPrefixes) {
    return __awaiter(this, void 0, void 0, function* () {
        let accessToken;
        let allowServiceConnection = tl.getVariable('PUBLISH_VIA_SERVICE_CONNECTION');
        if (allowServiceConnection) {
            let endpoint = tl.getInput('externalEndpoint', false);
            if (endpoint && isInternalFeed === true) {
                tl.debug("Found external endpoint, will use token for auth");
                let endpointAuth = tl.getEndpointAuthorization(endpoint, true);
                let endpointScheme = tl.getEndpointAuthorizationScheme(endpoint, true).toLowerCase();
                switch (endpointScheme) {
                    case ("token"):
                        accessToken = endpointAuth.parameters["apitoken"];
                        break;
                    default:
                        tl.warning(tl.loc("Warning_UnsupportedServiceConnectionAuth"));
                        break;
                }
            }
            if (!accessToken && isInternalFeed === true) {
                tl.debug("Checking for auth from Cred Provider.");
                const feed = (0, util_1.getProjectAndFeedIdFromInputParam)('feedPublish');
                const JsonEndpointsString = process.env["VSS_NUGET_EXTERNAL_FEED_ENDPOINTS"];
                if (JsonEndpointsString) {
                    tl.debug(`Feed details ${feed.feedId} ${feed.projectId}`);
                    tl.debug(`Endpoints found: ${JsonEndpointsString}`);
                    let endpointsArray = JSON.parse(JsonEndpointsString);
                    let matchingEndpoint;
                    for (const e of endpointsArray.endpointCredentials) {
                        for (const prefix of uriPrefixes) {
                            if (e.endpoint.toUpperCase().startsWith(prefix.toUpperCase())) {
                                let isServiceConnectionValid = yield tryServiceConnection(e, feed);
                                if (isServiceConnectionValid) {
                                    matchingEndpoint = e;
                                    break;
                                }
                            }
                        }
                        if (matchingEndpoint) {
                            accessToken = matchingEndpoint.password;
                            break;
                        }
                    }
                }
            }
            if (accessToken) {
                return accessToken;
            }
        }
        tl.debug('Defaulting to use the System Access Token.');
        accessToken = pkgLocationUtils.getSystemAccessToken();
        return accessToken;
    });
}
function tryServiceConnection(endpoint, feed) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create request
        const request = new restutilities_1.WebRequest();
        const token64 = Buffer.from(`${endpoint.username}:${endpoint.password}`).toString('base64');
        request.uri = endpoint.endpoint;
        request.method = 'GET';
        request.headers = {
            "Content-Type": "application/json",
            "Authorization": "Basic " + token64
        };
        const timeout = (0, utility_1.getRequestTimeout)();
        const retriableErrorCodes = ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "ESOCKETTIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "EPIPE", "EA_AGAIN"];
        const retriableStatusCodes = [408, 409, 500, 502, 503, 504];
        const options = {
            retryCount: 3,
            retryIntervalInSeconds: 5,
            retriableErrorCodes,
            retriableStatusCodes,
            retryRequestTimedout: true,
            socketTimeout: timeout,
            httpGlobalAgentOptions: {
                timeout: timeout
            }
        };
        const response = yield (0, restutilities_1.sendRequest)(request, options);
        if (response.statusCode == 200) {
            if (response.body) {
                for (const entry of response.body.resources) {
                    if (entry['@type'] === 'AzureDevOpsProjectId' && !(entry['label'].toUpperCase() === feed.projectId.toUpperCase() || entry['@id'].toUpperCase().endsWith(feed.projectId.toUpperCase()))) {
                        return false;
                    }
                    if (entry['@type'] === 'VssFeedId' && !(entry['label'].toUpperCase() === feed.feedId.toUpperCase() || entry['@id'].toUpperCase().endsWith(feed.feedId.toUpperCase()))) {
                        return false;
                    }
                }
                // We found matches in feedId and projectId, return the service connection
                return true;
            }
        }
        return false;
    });
}
