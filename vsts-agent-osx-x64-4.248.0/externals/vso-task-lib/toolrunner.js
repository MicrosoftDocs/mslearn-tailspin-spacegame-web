/// <reference path="../definitions/node.d.ts" />
/// <reference path="../definitions/Q.d.ts" />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require('q');
var os = require('os');
var events = require('events');
var child = require('child_process');
var run = function (cmd, callback) {
    console.log('running: ' + cmd);
    var output = '';
    try {
    }
    catch (err) {
        console.log(err.message);
    }
};
;
function debug(message) {
    // do nothing, overridden
}
exports.debug = debug;
;
var ToolRunner = (function (_super) {
    __extends(ToolRunner, _super);
    function ToolRunner(toolPath) {
        debug('toolRunner toolPath: ' + toolPath);
        this.toolPath = toolPath;
        this.args = [];
        this.silent = false;
        _super.call(this);
    }
    ToolRunner.prototype._debug = function (message) {
        if (!this.silent) {
            debug(message);
        }
        this.emit('debug', message);
    };
    ToolRunner.prototype._argStringToArray = function (argString) {
        var args = argString.match(/([^" ]*("[^"]*")[^" ]*)|[^" ]+/g);
        //remove double quotes from each string in args as child_process.spawn() cannot handle literla quotes as part of arguments
        for (var i = 0; i < args.length; i++) {
            args[i] = args[i].replace(/"/g, "");
        }
        return args;
    };
    ToolRunner.prototype.arg = function (val) {
        if (!val) {
            return;
        }
        if (val instanceof Array) {
            this._debug(this.toolPath + ' arg: ' + JSON.stringify(val));
            this.args = this.args.concat(val);
        }
        else if (typeof (val) === 'string') {
            this._debug(this.toolPath + ' arg: ' + val);
            this.args = this.args.concat(this._argStringToArray(val));
        }
    };
    ToolRunner.prototype.argIf = function (condition, val) {
        if (condition) {
            this.arg(val);
        }
    };
    //
    // Exec - use for long running tools where you need to stream live output as it runs
    //        returns a promise with return code.
    //
    ToolRunner.prototype.exec = function (options) {
        var _this = this;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('Arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = options || {};
        var ops = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            outStream: options.outStream || process.stdout,
            errStream: options.errStream || process.stderr,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false
        };
        var argString = this.args.join(' ') || '';
        var cmdString = this.toolPath;
        if (argString) {
            cmdString += (' ' + argString);
        }
        if (!ops.silent) {
            ops.outStream.write('[command]' + cmdString + os.EOL);
        }
        // TODO: filter process.env
        var cp = child.spawn(this.toolPath, this.args, { cwd: ops.cwd, env: ops.env });
        cp.stdout.on('data', function (data) {
            _this.emit('stdout', data);
            if (!ops.silent) {
                ops.outStream.write(data);
            }
        });
        cp.stderr.on('data', function (data) {
            _this.emit('stderr', data);
            success = !ops.failOnStdErr;
            if (!ops.silent) {
                var s = ops.failOnStdErr ? ops.errStream : ops.outStream;
                s.write(data);
            }
        });
        cp.on('error', function (err) {
            defer.reject(new Error(_this.toolPath + ' failed. ' + err.message));
        });
        cp.on('exit', function (code, signal) {
            _this._debug('rc:' + code);
            if (code != 0 && !ops.ignoreReturnCode) {
                success = false;
            }
            _this._debug('success:' + success);
            if (success) {
                defer.resolve(code);
            }
            else {
                defer.reject(new Error(_this.toolPath + ' failed with return code: ' + code));
            }
        });
        return defer.promise;
    };
    //
    // ExecSync - use for short running simple commands.  Simple and convenient (synchronous)
    //            but also has limits.  For example, no live output and limited to max buffer
    //
    ToolRunner.prototype.execSync = function (options) {
        var _this = this;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('Arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = options || {};
        var ops = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            outStream: options.outStream || process.stdout,
            errStream: options.errStream || process.stderr,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false
        };
        var argString = this.args.join(' ') || '';
        var cmdString = this.toolPath;
        if (argString) {
            cmdString += (' ' + argString);
        }
        if (!ops.silent) {
            ops.outStream.write('[command]' + cmdString + os.EOL);
        }
        var r = child.spawnSync(this.toolPath, this.args, { cwd: ops.cwd, env: ops.env });
        if (r.stdout && r.stdout.length > 0) {
            ops.outStream.write(r.stdout);
        }
        if (r.stderr && r.stderr.length > 0) {
            ops.errStream.write(r.stderr);
        }
        return { code: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error };
    };
    return ToolRunner;
})(events.EventEmitter);
exports.ToolRunner = ToolRunner;
