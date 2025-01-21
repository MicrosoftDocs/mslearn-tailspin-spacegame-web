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
exports.getPublishRegistry = exports.run = void 0;
const tl = require("azure-pipelines-task-lib/task");
const constants_1 = require("./constants");
const npmregistry_1 = require("azure-pipelines-tasks-packaging-common/npm/npmregistry");
const npmtoolrunner_1 = require("./npmtoolrunner");
const util = require("azure-pipelines-tasks-packaging-common/util");
const npmutil = require("azure-pipelines-tasks-packaging-common/npm/npmutil");
const npmrcparser = require("azure-pipelines-tasks-packaging-common/npm/npmrcparser");
const locationUtilities_1 = require("azure-pipelines-tasks-packaging-common/locationUtilities");
const os = require("os");
function run(packagingLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = tl.getInput(constants_1.NpmTaskInput.WorkingDir) || process.cwd();
        const npmrc = npmutil.getTempNpmrcPath();
        const npmRegistry = yield getPublishRegistry(packagingLocation);
        tl.debug(tl.loc('PublishRegistry', npmRegistry.url));
        npmutil.appendToNpmrc(npmrc, `registry=${npmRegistry.url}\n`);
        npmutil.appendToNpmrc(npmrc, `${npmRegistry.auth}\n`);
        // For publish, always override their project .npmrc
        const npm = new npmtoolrunner_1.NpmToolRunner(workingDir, npmrc, true);
        npm.line('publish');
        npm.execSync();
        tl.rmRF(npmrc);
        tl.rmRF(util.getTempPath());
    });
}
exports.run = run;
/** Return Publish NpmRegistry with masked auth*/
function getPublishRegistry(packagingLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        let npmRegistry;
        const registryLocation = tl.getInput(constants_1.NpmTaskInput.PublishRegistry) || null;
        switch (registryLocation) {
            case constants_1.RegistryLocation.Feed:
                tl.debug(tl.loc('PublishFeed'));
                const feed = util.getProjectAndFeedIdFromInputParam(constants_1.NpmTaskInput.PublishFeed);
                npmRegistry = yield getNpmRegistry(packagingLocation.DefaultPackagingUri, feed, false /* authOnly */, true /* useSession */);
                break;
            case constants_1.RegistryLocation.External:
                tl.debug(tl.loc('PublishExternal'));
                const endpointId = tl.getInput(constants_1.NpmTaskInput.PublishEndpoint, true);
                npmRegistry = yield npmregistry_1.NpmRegistry.FromServiceEndpoint(endpointId);
                break;
        }
        return npmRegistry;
    });
}
exports.getPublishRegistry = getPublishRegistry;
/** Return NpmRegistry with masked auth*/
function getNpmRegistry(defaultPackagingUri, feed, authOnly, useSession) {
    return __awaiter(this, void 0, void 0, function* () {
        const lineEnd = os.EOL;
        let url;
        let nerfed;
        let auth;
        let username;
        let email;
        let password64;
        url = npmrcparser.NormalizeRegistry(yield (0, locationUtilities_1.getFeedRegistryUrl)(defaultPackagingUri, locationUtilities_1.RegistryType.npm, feed.feedId, feed.projectId, null, useSession));
        nerfed = util.toNerfDart(url);
        // Setting up auth info
        const accessToken = getAccessToken();
        // Azure DevOps does not support PATs+Bearer only JWTs+Bearer
        email = 'VssEmail';
        username = 'VssToken';
        password64 = Buffer.from(accessToken).toString('base64');
        tl.setSecret(password64);
        auth = nerfed + ':username=' + username + lineEnd;
        auth += nerfed + ':_password=' + password64 + lineEnd;
        auth += nerfed + ':email=' + email + lineEnd;
        return new npmregistry_1.NpmRegistry(url, auth, authOnly);
    });
}
/** Return a masked AccessToken */
function getAccessToken() {
    let accessToken;
    let allowServiceConnection = tl.getVariable('PUBLISH_VIA_SERVICE_CONNECTION');
    if (allowServiceConnection) {
        let endpoint = tl.getInput('publishEndpoint', false);
        if (endpoint) {
            tl.debug("Found external endpoint, will use token for auth");
            let endpointAuth = tl.getEndpointAuthorization(endpoint, true);
            let endpointScheme = tl.getEndpointAuthorizationScheme(endpoint, true).toLowerCase();
            switch (endpointScheme) {
                case ("token"):
                    accessToken = endpointAuth.parameters["apitoken"];
                    break;
                default:
                    tl.warning(tl.loc("UnsupportedServiceConnectionAuth"));
                    break;
            }
        }
        if (!accessToken) {
            tl.debug('Defaulting to use the System Access Token.');
            accessToken = (0, locationUtilities_1.getSystemAccessToken)();
        }
    }
    else {
        accessToken = (0, locationUtilities_1.getSystemAccessToken)();
    }
    tl.setSecret(accessToken);
    return accessToken;
}
