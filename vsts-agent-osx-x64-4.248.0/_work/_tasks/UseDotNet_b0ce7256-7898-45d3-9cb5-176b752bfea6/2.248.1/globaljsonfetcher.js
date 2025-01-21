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
exports.GlobalJson = exports.globalJsonFetcher = void 0;
const fileSystem = require("fs");
const tl = require("azure-pipelines-task-lib/task");
const JSON5 = require("json5");
const versionfetcher_1 = require("./versionfetcher");
class globalJsonFetcher {
    /**
     * The global json fetcher provider functionality to extract the version information from all global json in the working directory.
     * @param workingDirectory
     */
    constructor(workingDirectory) {
        this.versionFetcher = new versionfetcher_1.DotNetCoreVersionFetcher(true);
        this.workingDirectory = workingDirectory;
    }
    /**
     * Get all version information from all global.json starting from the working directory without duplicates.
     */
    GetVersions() {
        return __awaiter(this, void 0, void 0, function* () {
            var versionInformation = new Array();
            var versionStrings = this.getVersionStrings();
            for (let index = 0; index < versionStrings.length; index++) {
                const version = versionStrings[index];
                if (version != null) {
                    var versionInfo = yield this.versionFetcher.getVersionInfo(version, null, "sdk", false);
                    versionInformation.push(versionInfo);
                }
            }
            return Array.from(new Set(versionInformation)); // this remove all not unique values.
        });
    }
    getVersionStrings() {
        let filePathsToGlobalJson = tl.findMatch(this.workingDirectory, "**/global.json");
        if (filePathsToGlobalJson == null || filePathsToGlobalJson.length == 0) {
            throw tl.loc("FailedToFindGlobalJson", this.workingDirectory);
        }
        return filePathsToGlobalJson.map(path => {
            var content = this.readGlobalJson(path);
            if (content != null) {
                tl.loc("GlobalJsonSdkVersion", content.sdk.version, path);
                return content.sdk.version;
            }
            return null;
        })
            .filter(d => d != null); // remove all global.json that can't read
    }
    readGlobalJson(path) {
        let globalJson = null;
        tl.loc("GlobalJsonFound", path);
        try {
            let fileContent = fileSystem.readFileSync(path);
            // Since here is a buffer, we need to check length property to determine if it is empty. 
            if (!fileContent.length) {
                // do not throw if globa.json is empty, task need not install any version in such case.
                tl.loc("GlobalJsonIsEmpty", path);
                return null;
            }
            globalJson = (JSON5.parse(fileContent.toString()));
        }
        catch (error) {
            // we throw if the global.json is invalid
            throw tl.loc("FailedToReadGlobalJson", path, error); // We don't throw if a global.json is invalid.
        }
        if (globalJson == null || globalJson.sdk == null || globalJson.sdk.version == null) {
            tl.loc("FailedToReadGlobalJson", path);
            return null;
        }
        return globalJson;
    }
}
exports.globalJsonFetcher = globalJsonFetcher;
class GlobalJson {
    constructor(version = null) {
        if (version != null) {
            this.sdk = new sdk();
            this.sdk.version = version;
        }
    }
}
exports.GlobalJson = GlobalJson;
class sdk {
}
