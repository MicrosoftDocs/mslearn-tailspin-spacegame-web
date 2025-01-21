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
exports.getCustomRegistries = exports.run = void 0;
const tl = require("azure-pipelines-task-lib/task");
const constants_1 = require("./constants");
const npmregistry_1 = require("azure-pipelines-tasks-packaging-common/npm/npmregistry");
const npmtoolrunner_1 = require("./npmtoolrunner");
const util = require("azure-pipelines-tasks-packaging-common/util");
const npmutil = require("azure-pipelines-tasks-packaging-common/npm/npmutil");
function run(packagingLocation, command) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = tl.getInput(constants_1.NpmTaskInput.WorkingDir) || process.cwd();
        const npmrc = npmutil.getTempNpmrcPath();
        const npmRegistries = yield getCustomRegistries(packagingLocation);
        const overrideNpmrc = (tl.getInput(constants_1.NpmTaskInput.CustomRegistry) === constants_1.RegistryLocation.Feed) ? true : false;
        for (const registry of npmRegistries) {
            if (registry.authOnly === false) {
                tl.debug(tl.loc('UsingRegistry', registry.url));
                npmutil.appendToNpmrc(npmrc, `registry=${registry.url}\n`);
            }
            tl.debug(tl.loc('AddingAuthRegistry', registry.url));
            npmutil.appendToNpmrc(npmrc, `${registry.auth}\n`);
        }
        const npm = new npmtoolrunner_1.NpmToolRunner(workingDir, npmrc, overrideNpmrc);
        npm.line(command || tl.getInput(constants_1.NpmTaskInput.CustomCommand, true));
        npm.execSync();
        tl.rmRF(npmrc);
        tl.rmRF(util.getTempPath());
    });
}
exports.run = run;
/** Return Custom NpmRegistry with masked auth*/
function getCustomRegistries(packagingLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = tl.getInput(constants_1.NpmTaskInput.WorkingDir) || process.cwd();
        const npmRegistries = yield npmutil.getLocalNpmRegistries(workingDir, packagingLocation.PackagingUris);
        const registryLocation = tl.getInput(constants_1.NpmTaskInput.CustomRegistry) || null;
        switch (registryLocation) {
            case constants_1.RegistryLocation.Feed:
                tl.debug(tl.loc('UseFeed'));
                const feed = util.getProjectAndFeedIdFromInputParam(constants_1.NpmTaskInput.CustomFeed);
                npmRegistries.push(yield npmregistry_1.NpmRegistry.FromFeedId(packagingLocation.DefaultPackagingUri, feed.feedId, feed.projectId));
                break;
            case constants_1.RegistryLocation.Npmrc:
                tl.debug(tl.loc('UseNpmrc'));
                const endpointIds = tl.getDelimitedInput(constants_1.NpmTaskInput.CustomEndpoint, ',');
                if (endpointIds && endpointIds.length > 0) {
                    yield Promise.all(endpointIds.map((e) => __awaiter(this, void 0, void 0, function* () {
                        npmRegistries.push(yield npmregistry_1.NpmRegistry.FromServiceEndpoint(e, true));
                    })));
                }
                break;
        }
        return npmRegistries;
    });
}
exports.getCustomRegistries = getCustomRegistries;
