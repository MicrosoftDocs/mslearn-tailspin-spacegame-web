/// <reference path="../definitions/node.d.ts" />
/// <reference path="../definitions/Q.d.ts" />
/// <reference path="../definitions/shelljs.d.ts" />
/// <reference path="../definitions/minimatch.d.ts" />
/// <reference path="../definitions/glob.d.ts" />
"use strict";
var shell = require('shelljs');
var fs = require('fs');
var path = require('path');
var os = require('os');
var minimatch = require('minimatch');
var globm = require('glob');
var util = require('util');
var tcm = require('./taskcommand');
var trm = require('./toolrunner');
(function (TaskResult) {
    TaskResult[TaskResult["Succeeded"] = 0] = "Succeeded";
    TaskResult[TaskResult["Failed"] = 1] = "Failed";
})(exports.TaskResult || (exports.TaskResult = {}));
var TaskResult = exports.TaskResult;
//-----------------------------------------------------
// String convenience
//-----------------------------------------------------
function startsWith(str, start) {
    return str.slice(0, start.length) == start;
}
function endsWith(str, end) {
    return str.slice(-str.length) == end;
}
//-----------------------------------------------------
// General Helpers
//-----------------------------------------------------
exports._outStream = process.stdout;
exports._errStream = process.stderr;
function _writeError(str) {
    exports._errStream.write(str + os.EOL);
}
exports._writeError = _writeError;
function _writeLine(str) {
    exports._outStream.write(str + os.EOL);
}
exports._writeLine = _writeLine;
function setStdStream(stdStream) {
    exports._outStream = stdStream;
}
exports.setStdStream = setStdStream;
function setErrStream(errStream) {
    exports._errStream = errStream;
}
exports.setErrStream = setErrStream;
//-----------------------------------------------------
// Results and Exiting
//-----------------------------------------------------
function setResult(result, message) {
    debug('task result: ' + TaskResult[result]);
    command('task.complete', { 'result': TaskResult[result] }, message);
    if (result == TaskResult.Failed) {
        _writeError(message);
    }
    if (result == TaskResult.Failed && !process.env['TASKLIB_INPROC_UNITS']) {
        process.exit(0);
    }
}
exports.setResult = setResult;
function handlerError(errMsg, continueOnError) {
    if (continueOnError) {
        error(errMsg);
    }
    else {
        setResult(TaskResult.Failed, errMsg);
    }
}
exports.handlerError = handlerError;
//
// Catching all exceptions
//
process.on('uncaughtException', function (err) {
    setResult(TaskResult.Failed, loc('LIB_UnhandledEx', err.message));
});
function exitOnCodeIf(code, condition) {
    if (condition) {
        setResult(TaskResult.Failed, loc('LIB_FailOnCode', code));
    }
}
exports.exitOnCodeIf = exitOnCodeIf;
//
// back compat: should use setResult
//
function exit(code) {
    setResult(code, loc('LIB_ReturnCode', code));
}
exports.exit = exit;
//-----------------------------------------------------
// Loc Helpers
//-----------------------------------------------------
var locStringCache = {};
var resourceFile;
var libResourceFileLoaded = false;
function loadLocStrings(resourceFile) {
    var locStrings = {};
    if (exist(resourceFile)) {
        debug('load loc strings from: ' + resourceFile);
        var resourceJson = require(resourceFile);
        if (resourceJson && resourceJson.hasOwnProperty('messages')) {
            for (var key in resourceJson.messages) {
                if (typeof (resourceJson.messages[key]) === 'object') {
                    if (resourceJson.messages[key].loc && resourceJson.messages[key].loc.toString().length > 0) {
                        locStrings[key] = resourceJson.messages[key].loc.toString();
                    }
                    else if (resourceJson.messages[key].fallback) {
                        locStrings[key] = resourceJson.messages[key].fallback.toString();
                    }
                }
                else if (typeof (resourceJson.messages[key]) === 'string') {
                    locStrings[key] = resourceJson.messages[key];
                }
            }
        }
    }
    else {
        warning(loc('LIB_ResourceFileNotExist', resourceFile));
    }
    return locStrings;
}
function setResourcePath(path) {
    if (process.env['TASKLIB_INPROC_UNITS']) {
        resourceFile = null;
        libResourceFileLoaded = false;
        locStringCache = {};
    }
    if (!resourceFile) {
        checkPath(path, 'resource file path');
        resourceFile = path;
        debug('set resource file to: ' + resourceFile);
        var locStrs = loadLocStrings(resourceFile);
        for (var key in locStrs) {
            debug('cache loc string: ' + key);
            locStringCache[key] = locStrs[key];
        }
    }
    else {
        warning(loc('LIB_ResourceFileAlreadySet', resourceFile));
    }
}
exports.setResourcePath = setResourcePath;
function loc(key) {
    var param = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        param[_i - 1] = arguments[_i];
    }
    if (!libResourceFileLoaded) {
        // merge loc strings from vso-task-lib.
        var libResourceFile = path.join(__dirname, 'lib.json');
        var libLocStrs = loadLocStrings(libResourceFile);
        for (var libKey in libLocStrs) {
            debug('cache vso-task-lib loc string: ' + libKey);
            locStringCache[libKey] = libLocStrs[libKey];
        }
        libResourceFileLoaded = true;
    }
    var locString;
    ;
    if (locStringCache.hasOwnProperty(key)) {
        locString = locStringCache[key];
    }
    else {
        if (!resourceFile) {
            warning(loc('LIB_ResourceFileNotSet', key));
        }
        else {
            warning(loc('LIB_LocStringNotFound', key));
        }
        locString = key;
    }
    if (param.length > 0) {
        return util.format.apply(this, [locString].concat(param));
    }
    else {
        return locString;
    }
}
exports.loc = loc;
//-----------------------------------------------------
// Input Helpers
//-----------------------------------------------------
function getVariable(name) {
    var varval = process.env[name.replace(/\./g, '_').toUpperCase()];
    debug(name + '=' + varval);
    return varval;
}
exports.getVariable = getVariable;
function setVariable(name, val) {
    if (!name) {
        setResult(TaskResult.Failed, loc('LIB_ParameterIsRequired', 'name'));
    }
    var varValue = val || '';
    process.env[name.replace(/\./g, '_').toUpperCase()] = varValue;
    debug('set ' + name + '=' + varValue);
    command('task.setvariable', { 'variable': name || '' }, varValue);
}
exports.setVariable = setVariable;
function getInput(name, required) {
    var inval = process.env['INPUT_' + name.replace(' ', '_').toUpperCase()];
    if (inval) {
        inval = inval.trim();
    }
    if (required && !inval) {
        setResult(TaskResult.Failed, loc('LIB_InputRequired', name));
    }
    debug(name + '=' + inval);
    return inval;
}
exports.getInput = getInput;
function getBoolInput(name, required) {
    return getInput(name, required) == "true";
}
exports.getBoolInput = getBoolInput;
function setEnvVar(name, val) {
    if (val) {
        process.env[name] = val;
    }
}
exports.setEnvVar = setEnvVar;
//
// Split - do not use for splitting args!  Instead use arg() - it will split and handle
//         this is for splitting a simple list of items like targets
//
function getDelimitedInput(name, delim, required) {
    var inval = getInput(name, required);
    if (!inval) {
        return [];
    }
    return inval.split(delim);
}
exports.getDelimitedInput = getDelimitedInput;
function filePathSupplied(name) {
    // normalize paths
    var pathValue = path.resolve(this.getPathInput(name) || '');
    var repoRoot = path.resolve(this.getVariable('build.sourcesDirectory') || '');
    var supplied = pathValue !== repoRoot;
    debug(name + 'path supplied :' + supplied);
    return supplied;
}
exports.filePathSupplied = filePathSupplied;
function getPathInput(name, required, check) {
    var inval = getInput(name, required);
    if (inval) {
        if (check) {
            checkPath(inval, name);
        }
        if (inval.indexOf(' ') > 0) {
            if (!startsWith(inval, '"')) {
                inval = '"' + inval;
            }
            if (!endsWith(inval, '"')) {
                inval += '"';
            }
        }
    }
    debug(name + '=' + inval);
    return inval;
}
exports.getPathInput = getPathInput;
//-----------------------------------------------------
// Endpoint Helpers
//-----------------------------------------------------
function getEndpointUrl(id, optional) {
    var urlval = process.env['ENDPOINT_URL_' + id];
    if (!optional && !urlval) {
        setResult(TaskResult.Failed, loc('LIB_EndpointNotExist', id));
    }
    debug(id + '=' + urlval);
    return urlval;
}
exports.getEndpointUrl = getEndpointUrl;
function getEndpointAuthorization(id, optional) {
    var aval = process.env['ENDPOINT_AUTH_' + id];
    if (!optional && !aval) {
        setResult(TaskResult.Failed, loc('LIB_EndpointNotExist', id));
    }
    debug(id + '=' + aval);
    var auth;
    try {
        auth = JSON.parse(aval);
    }
    catch (err) {
        setResult(TaskResult.Failed, loc('LIB_InvalidEndpointAuth', aval)); // exit
    }
    return auth;
}
exports.getEndpointAuthorization = getEndpointAuthorization;
function stats(path) {
    return fs.statSync(path);
}
exports.stats = stats;
function exist(path) {
    return path && fs.existsSync(path);
}
exports.exist = exist;
//-----------------------------------------------------
// Cmd Helpers
//-----------------------------------------------------
function command(command, properties, message) {
    var taskCmd = new tcm.TaskCommand(command, properties, message);
    _writeLine(taskCmd.toString());
}
exports.command = command;
function warning(message) {
    command('task.issue', { 'type': 'warning' }, message);
}
exports.warning = warning;
function error(message) {
    command('task.issue', { 'type': 'error' }, message);
}
exports.error = error;
function debug(message) {
    command('task.debug', null, message);
}
exports.debug = debug;
var _argStringToArray = function (argString) {
    var args = argString.match(/([^" ]*("[^"]*")[^" ]*)|[^" ]+/g);
    for (var i = 0; i < args.length; i++) {
        args[i] = args[i].replace(/"/g, "");
    }
    return args;
};
function cd(path) {
    if (path) {
        shell.cd(path);
    }
}
exports.cd = cd;
function pushd(path) {
    shell.pushd(path);
}
exports.pushd = pushd;
function popd() {
    shell.popd();
}
exports.popd = popd;
//------------------------------------------------
// Validation Helpers
//------------------------------------------------
function checkPath(p, name) {
    debug('check path : ' + p);
    if (!exist(p)) {
        setResult(TaskResult.Failed, loc('LIB_PathNotFound', name, p)); // exit
    }
}
exports.checkPath = checkPath;
//-----------------------------------------------------
// Shell/File I/O Helpers
// Abstract these away so we can
// - default to good error handling
// - inject system.debug info
// - have option to switch internal impl (shelljs now)
//-----------------------------------------------------
function mkdirP(p) {
    var success = true;
    try {
        if (!p) {
            throw new Error(loc('LIB_ParameterIsRequired', 'p'));
        }
        // certain chars like \0 will cause shelljs and fs
        // to blow up without exception or error
        if (p.indexOf('\0') >= 0) {
            throw new Error(loc('LIB_PathHasNullByte'));
        }
        if (!shell.test('-d', p)) {
            debug('creating path: ' + p);
            shell.mkdir('-p', p);
            var errMsg = shell.error();
            if (errMsg) {
                handlerError(errMsg, false);
                success = false;
            }
        }
        else {
            debug('path exists: ' + p);
        }
    }
    catch (err) {
        success = false;
        handlerError(loc('LIB_OperationFailed', 'mkdirP', err.message), false);
    }
    return success;
}
exports.mkdirP = mkdirP;
function which(tool, check) {
    try {
        // we can't use shelljs.which() on windows due to https://github.com/shelljs/shelljs/issues/238
        // shelljs.which() does not prefer file with executable extensions (.exe, .bat, .cmd).
        // we already made a PR for Shelljs, but they haven't merge it yet. https://github.com/shelljs/shelljs/pull/239
        if (os.type().match(/^Win/)) {
            var pathEnv = process.env.path || process.env.Path || process.env.PATH;
            var pathArray = pathEnv.split(';');
            var toolPath = null;
            // No relative/absolute paths provided?
            if (tool.search(/[\/\\]/) === -1) {
                // Search for command in PATH
                pathArray.forEach(function (dir) {
                    if (toolPath)
                        return; // already found it
                    var attempt = path.resolve(dir + '/' + tool);
                    var baseAttempt = attempt;
                    attempt = baseAttempt + '.exe';
                    if (exist(attempt) && stats(attempt).isFile) {
                        toolPath = attempt;
                        return;
                    }
                    attempt = baseAttempt + '.cmd';
                    if (exist(attempt) && stats(attempt).isFile) {
                        toolPath = attempt;
                        return;
                    }
                    attempt = baseAttempt + '.bat';
                    if (exist(attempt) && stats(attempt).isFile) {
                        toolPath = attempt;
                        return;
                    }
                });
            }
            // Command not found in Path, but the input itself is point to a file.
            if (!toolPath && exist(tool) && stats(tool).isFile) {
                toolPath = path.resolve(tool);
            }
        }
        else {
            var toolPath = shell.which(tool);
        }
        if (check) {
            checkPath(toolPath, tool);
        }
        debug(tool + '=' + toolPath);
        return toolPath;
    }
    catch (err) {
        handlerError(loc('LIB_OperationFailed', 'which', err.message), false);
    }
}
exports.which = which;
function cp(options, source, dest, continueOnError) {
    var success = true;
    try {
        shell.cp(options, source, dest);
        var errMsg = shell.error();
        if (errMsg) {
            handlerError(errMsg, continueOnError);
            success = false;
        }
    }
    catch (err) {
        success = false;
        handlerError(loc('LIB_OperationFailed', 'cp', err.message), false);
    }
    return success;
}
exports.cp = cp;
function mv(source, dest, force, continueOnError) {
    var success = true;
    try {
        if (force) {
            shell.mv('-f', source, dest);
        }
        else {
            shell.mv(source, dest);
        }
        var errMsg = shell.error();
        if (errMsg) {
            handlerError(errMsg, continueOnError);
            success = false;
        }
    }
    catch (err) {
        success = false;
        handlerError(loc('LIB_OperationFailed', 'mv', err.message), false);
    }
    return success;
}
exports.mv = mv;
function find(findPath) {
    try {
        if (!shell.test('-e', findPath)) {
            return [];
        }
        var matches = shell.find(findPath);
        debug('find ' + findPath);
        debug(matches.length + ' matches.');
        return matches;
    }
    catch (err) {
        handlerError(loc('LIB_OperationFailed', 'find', err.message), false);
    }
}
exports.find = find;
function rmRF(path, continueOnError) {
    var success = true;
    try {
        debug('rm -rf ' + path);
        shell.rm('-rf', path);
        var errMsg = shell.error();
        // if you try to delete a file that doesn't exist, desired result is achieved
        // other errors are valid
        if (errMsg && !(errMsg.indexOf('ENOENT') === 0)) {
            handlerError(errMsg, continueOnError);
            success = false;
        }
    }
    catch (err) {
        success = false;
        handlerError(loc('LIB_OperationFailed', 'rmRF', err.message), false);
    }
    return success;
}
exports.rmRF = rmRF;
function glob(pattern) {
    debug('glob ' + pattern);
    var matches = globm.sync(pattern);
    debug('found ' + matches.length + ' matches');
    if (matches.length > 0) {
        var m = Math.min(matches.length, 10);
        debug('matches:');
        if (m == 10) {
            debug('listing first 10 matches as samples');
        }
        for (var i = 0; i < m; i++) {
            debug(matches[i]);
        }
    }
    return matches;
}
exports.glob = glob;
function globFirst(pattern) {
    debug('globFirst ' + pattern);
    var matches = glob(pattern);
    if (matches.length > 1) {
        warning(loc('LIB_UseFirstGlobMatch'));
    }
    debug('found ' + matches.length + ' matches');
    return matches[0];
}
exports.globFirst = globFirst;
//-----------------------------------------------------
// Exec convenience wrapper
//-----------------------------------------------------
function exec(tool, args, options) {
    var toolPath = which(tool, true);
    var tr = createToolRunner(toolPath);
    if (args) {
        tr.arg(args);
    }
    return tr.exec(options);
}
exports.exec = exec;
function execSync(tool, args, options) {
    var toolPath = which(tool, true);
    var tr = createToolRunner(toolPath);
    if (args) {
        tr.arg(args);
    }
    return tr.execSync(options);
}
exports.execSync = execSync;
function createToolRunner(tool) {
    var tr = new trm.ToolRunner(tool);
    tr.on('debug', function (message) {
        debug(message);
    });
    return tr;
}
exports.createToolRunner = createToolRunner;
//-----------------------------------------------------
// Matching helpers
//-----------------------------------------------------
function match(list, pattern, options) {
    return minimatch.match(list, pattern, options);
}
exports.match = match;
function filter(pattern, options) {
    return minimatch.filter(pattern, options);
}
exports.filter = filter;
//-----------------------------------------------------
// Test Publisher
//-----------------------------------------------------
var TestPublisher = (function () {
    function TestPublisher(testRunner) {
        this.testRunner = testRunner;
    }
    TestPublisher.prototype.publish = function (resultFiles, mergeResults, platform, config, runTitle, publishRunAttachments) {
        if (mergeResults == 'true') {
            _writeLine(loc('LIB_MergeTestResultNotSupported'));
        }
        var properties = {};
        properties['type'] = this.testRunner;
        if (platform) {
            properties['platform'] = platform;
        }
        if (config) {
            properties['config'] = config;
        }
        if (runTitle) {
            properties['runTitle'] = runTitle;
        }
        if (publishRunAttachments) {
            properties['publishRunAttachments'] = publishRunAttachments;
        }
        for (var i = 0; i < resultFiles.length; i++) {
            properties['fileNumber'] = i.toString();
            command('results.publish', properties, resultFiles[i]);
        }
    };
    return TestPublisher;
})();
exports.TestPublisher = TestPublisher;
//-----------------------------------------------------
// Tools
//-----------------------------------------------------
exports.TaskCommand = tcm.TaskCommand;
exports.commandFromString = tcm.commandFromString;
exports.ToolRunner = trm.ToolRunner;
trm.debug = debug;
