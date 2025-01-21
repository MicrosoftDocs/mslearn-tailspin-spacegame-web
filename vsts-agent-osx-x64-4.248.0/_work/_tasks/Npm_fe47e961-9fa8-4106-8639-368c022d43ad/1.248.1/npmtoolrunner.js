"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpmToolRunner = void 0;
const fs = require("fs");
const path = require("path");
const url_1 = require("url");
const Q = require("q");
const tl = require("azure-pipelines-task-lib/task");
const tr = require("azure-pipelines-task-lib/toolrunner");
const constants_1 = require("./constants");
const util = require("azure-pipelines-tasks-packaging-common/util");
const npmutil = require("azure-pipelines-tasks-packaging-common/npm/npmutil");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
class NpmToolRunner extends tr.ToolRunner {
    constructor(workingDirectory, npmrc, overrideProjectNpmrc) {
        super('npm');
        this.workingDirectory = workingDirectory;
        this.npmrc = npmrc;
        this.overrideProjectNpmrc = overrideProjectNpmrc;
        this.projectNpmrc = () => path.join(this.workingDirectory, '.npmrc');
        this.on('debug', (message) => {
            tl.debug(message);
        });
        let debugVar = tl.getVariable('System.Debug') || '';
        if (debugVar.toLowerCase() === 'true') {
            this.dbg = true;
        }
        let cacheOptions = { silent: true };
        if (!tl.stats(workingDirectory).isDirectory()) {
            throw new Error(tl.loc('WorkingDirectoryNotDirectory'));
        }
        this.cacheLocation = tl.execSync('npm', 'config get cache', this._prepareNpmEnvironment(cacheOptions)).stdout.trim();
    }
    exec(options) {
        options = this._prepareNpmEnvironment(options);
        this._saveProjectNpmrc();
        return super.exec(options).then((code) => {
            this._restoreProjectNpmrc();
            return code;
        }, (reason) => {
            this._restoreProjectNpmrc();
            return this._printDebugLog(this._getDebugLogPath(options)).then((value) => {
                throw reason;
            });
        });
    }
    execSync(options) {
        options = this._prepareNpmEnvironment(options);
        this._saveProjectNpmrc();
        const execResult = super.execSync(options);
        this._restoreProjectNpmrc();
        if (execResult.code !== 0) {
            telemetry.logResult('Packaging', 'npm', execResult.code);
            this._printDebugLogSync(this._getDebugLogPath(options));
            throw new Error(tl.loc('NpmFailed', execResult.code));
        }
        return execResult;
    }
    static _getProxyFromEnvironment() {
        let proxyUrl = tl.getVariable('agent.proxyurl');
        if (proxyUrl) {
            let proxy = (0, url_1.parse)(proxyUrl);
            let proxyUsername = tl.getVariable('agent.proxyusername') || '';
            let proxyPassword = tl.getVariable('agent.proxypassword') || '';
            if (proxyUsername !== '') {
                proxy.auth = proxyUsername;
            }
            if (proxyPassword !== '') {
                proxy.auth = `${proxyUsername}:${proxyPassword}`;
            }
            const authProxy = (0, url_1.format)(proxy);
            // register the formatted proxy url as a secret if it contains a password
            if (proxyPassword !== '') {
                tl.setSecret(authProxy);
            }
            return authProxy;
        }
        return undefined;
    }
    _prepareNpmEnvironment(options) {
        options = options || {};
        options.cwd = this.workingDirectory;
        if (options.env === undefined) {
            options.env = process.env;
        }
        if (this.dbg || tl.getBoolInput(constants_1.NpmTaskInput.Verbose, false)) {
            options.env['NPM_CONFIG_LOGLEVEL'] = 'verbose';
        }
        if (this.npmrc) {
            options.env['NPM_CONFIG_USERCONFIG'] = this.npmrc;
        }
        function sanitizeUrl(url) {
            const parsed = (0, url_1.parse)(url);
            if (parsed.auth) {
                parsed.auth = "***:***";
            }
            return (0, url_1.format)(parsed);
        }
        let proxy = NpmToolRunner._getProxyFromEnvironment();
        if (proxy) {
            tl.debug(`Using proxy "${sanitizeUrl(proxy)}" for npm`);
            options.env['NPM_CONFIG_PROXY'] = proxy;
            options.env['NPM_CONFIG_HTTPS-PROXY'] = proxy;
            let proxybypass = this._getProxyBypass();
            if (proxybypass != null) {
                // check if there are any existing NOPROXY values
                let existingNoProxy = process.env["NO_PROXY"];
                if (existingNoProxy) {
                    existingNoProxy = existingNoProxy.trimRight();
                    // trim trailing comma
                    existingNoProxy = existingNoProxy.endsWith(',') ? existingNoProxy.slice(0, -1) : existingNoProxy;
                    // append our bypass list
                    proxybypass = existingNoProxy + ',' + proxybypass;
                }
                tl.debug(`Setting NO_PROXY for npm: "${proxybypass}"`);
                options.env['NO_PROXY'] = proxybypass;
            }
        }
        let config = tl.execSync('npm', `config list ${this.dbg ? '-l' : ''}`, options);
        return options;
    }
    _getProxyBypass() {
        // check if there are any proxy bypass hosts
        const proxyBypassHosts = JSON.parse(tl.getVariable('Agent.ProxyBypassList') || '[]');
        if (proxyBypassHosts == null || proxyBypassHosts.length == 0) {
            return undefined;
        }
        // get the potential package sources
        let registries = npmutil.getAllNpmRegistries(this.projectNpmrc());
        // convert to urls
        let registryUris = registries.reduce(function (result, currentRegistry) {
            try {
                const uri = (0, url_1.parse)(currentRegistry);
                if (uri.hostname != null) {
                    result.push(uri);
                }
            }
            finally {
                return result;
            }
        }, []);
        const bypassDomainSet = new Set();
        proxyBypassHosts.forEach((bypassHost => {
            // if there are no more registries, stop processing regexes 
            if (registryUris == null || registryUris.length == 0) {
                return;
            }
            let regex = new RegExp(bypassHost, 'i');
            // filter out the registries that match the current regex
            registryUris = registryUris.filter(registryUri => {
                if (regex.test(registryUri.href)) {
                    bypassDomainSet.add(registryUri.hostname);
                    return false;
                }
                return true;
            });
        }));
        // return a comma separated list of the bypass domains
        if (bypassDomainSet.size > 0) {
            const bypassDomainArray = Array.from(bypassDomainSet);
            return bypassDomainArray.join(',');
        }
        return undefined;
    }
    _getDebugLogPath(options) {
        // check cache
        const logs = tl.findMatch(path.join(this.cacheLocation, '_logs'), '*-debug.log');
        if (logs && logs.length > 0) {
            const debugLog = logs[logs.length - 1];
            console.log(tl.loc('FoundNpmDebugLog', debugLog));
            return debugLog;
        }
        // check working dir
        const cwd = options && options.cwd ? options.cwd : process.cwd();
        const debugLog = path.join(cwd, 'npm-debug.log');
        tl.debug(tl.loc('TestDebugLog', debugLog));
        if (tl.exist(debugLog)) {
            console.log(tl.loc('FoundNpmDebugLog', debugLog));
            return debugLog;
        }
        tl.warning(tl.loc('DebugLogNotFound'));
        return undefined;
    }
    _printDebugLog(log) {
        if (!log) {
            return Q.fcall(() => { });
        }
        return Q.nfcall(fs.readFile, log, 'utf-8').then((data) => {
            console.log(data);
        });
    }
    _printDebugLogSync(log) {
        if (!log) {
            return;
        }
        console.log(fs.readFileSync(log, 'utf-8'));
    }
    _saveProjectNpmrc() {
        if (this.overrideProjectNpmrc) {
            tl.debug(tl.loc('OverridingProjectNpmrc', this.projectNpmrc()));
            util.saveFile(this.projectNpmrc());
            tl.rmRF(this.projectNpmrc());
        }
    }
    _restoreProjectNpmrc() {
        if (this.overrideProjectNpmrc) {
            tl.debug(tl.loc('RestoringProjectNpmrc'));
            util.restoreFile(this.projectNpmrc());
        }
    }
}
exports.NpmToolRunner = NpmToolRunner;
