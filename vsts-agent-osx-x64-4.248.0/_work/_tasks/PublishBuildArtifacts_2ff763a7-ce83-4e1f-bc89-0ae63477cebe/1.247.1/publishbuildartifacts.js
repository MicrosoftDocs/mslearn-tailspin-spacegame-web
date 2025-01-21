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
const os = require("os");
const path = require("path");
var process = require('process');
const fs = require("fs");
const tl = require("azure-pipelines-task-lib/task");
const tr = require("azure-pipelines-task-lib/toolrunner");
// used for escaping the path to the Invoke-Robocopy.ps1 script that is passed to the powershell command
let pathToScriptPSString = (filePath) => {
    // remove double quotes
    let result = filePath.replace(/"/g, '');
    // double-up single quotes and enclose in single quotes. this is to create a single-quoted string in powershell.
    result = result.replace(/'/g, "''");
    return `'${result}'`;
};
// used for escaping file paths that are ultimately passed to robocopy (via the powershell command)
let pathToRobocopyPSString = (filePath) => {
    // the path needs to be fixed-up due to a robocopy quirk handling trailing backslashes.
    //
    // according to http://ss64.com/nt/robocopy.html:
    //   If either the source or desination are a "quoted long foldername" do not include a
    //   trailing backslash as this will be treated as an escape character, i.e. "C:\some path\"
    //   will fail but "C:\some path\\" or "C:\some path\." or "C:\some path" will work.
    //
    // furthermore, PowerShell implicitly double-quotes arguments to external commands when the
    // argument contains unquoted spaces.
    //
    // note, details on PowerShell quoting rules for external commands can be found in the
    // source code here:
    // https://github.com/PowerShell/PowerShell/blob/v0.6.0/src/System.Management.Automation/engine/NativeCommandParameterBinder.cs
    // remove double quotes
    let result = filePath.replace(/"/g, '');
    // append a "." if the path ends with a backslash. e.g. "C:\some path\" -> "C:\some path\."
    if (result.endsWith('\\')) {
        result += '.';
    }
    // double-up single quotes and enclose in single quotes. this is to create a single-quoted string in powershell.
    result = result.replace(/'/g, "''");
    return `'${result}'`;
};
/**
 * Creates plain (not compressed) tar archive from files located in `filesPath`.
 * `filesPath` input may contain a file or a folder with files.
 * Puts created tar file to temp directory ($(Agent.TempDirectory)/`artifactName`.tar).
 *
 * @param filesPath path to a file or a directory of files to add to a tar archive
 * @param artifactName the name of the artifact. This will be used to determine tar archive name
 * @returns string
 */
function createTarArchive(filesPath, artifactName) {
    const tar = tl.tool(tl.which('tar', true));
    const outputFilePath = path.join(tl.getVariable('Agent.TempDirectory'), `${artifactName}.tar`);
    if (tl.stats(filesPath).isFile()) {
        // If filesPath is a file, we only have to add a single file
        tar.arg(['cf', outputFilePath, '--directory', path.dirname(filesPath), path.basename(filesPath)]);
    }
    else {
        // If filesPath is a directory, we have to add all files from that directory to the tar archive
        tar.arg(['cf', outputFilePath, '--directory', filesPath, '.']);
    }
    const tarExecResult = tar.execSync();
    if (tarExecResult.error || tarExecResult.code !== 0) {
        throw new Error(`Couldn't add artifact files to a tar archive: ${tarExecResult.error}`);
    }
    return outputFilePath;
}
/**
 * If the `StoreAsTar` input is set to false, return path to publish unaltered;
 * otherwise add all files from this path to a tar archive and return path to that archive
 *
 * @param pathToPublish value of `PathtoPublish` input
 * @param shouldStoreAsTar value of `PathtoPublish` input
 * @param artifactName value of `ArtifactName` input
 * @returns string
 */
function getPathToUploadAndCreateTarIfNeeded(pathToPublish, shouldStoreAsTar, artifactName) {
    if (!shouldStoreAsTar) {
        return pathToPublish;
    }
    return createTarArchive(pathToPublish, artifactName);
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            tl.setResourcePath(path.join(__dirname, 'task.json'));
            const shouldStoreAsTar = tl.getBoolInput('StoreAsTar');
            const isWindows = os.platform() === 'win32';
            if (isWindows && shouldStoreAsTar) {
                tl.setResult(tl.TaskResult.Failed, tl.loc('TarExtractionNotSupportedInWindows'));
                return;
            }
            // pathToPublish is a folder or a single file that may be added to a tar archive later
            const pathToPublish = tl.getPathInput('PathtoPublish', true, true);
            var artifactName = tl.getInput('ArtifactName', true);
            // if FF EnableBuildArtifactsPlusSignWorkaround is enabled or AZP_TASK_FF_ENABLE_BUILDARTIFACTS_PLUS_SIGN_WORKAROUND environment variable is set:
            // replacing '+' symbol by its representation ' '(space) - workaround for the DownloadBuildArtifactV0 task,
            // where downloading of part of artifact is not possible if there is a plus symbol
            const enableBuildArtifactsPlusSignWorkaround = process.env.AZP_TASK_FF_ENABLE_BUILDARTIFACTS_PLUS_SIGN_WORKAROUND ? process.env.AZP_TASK_FF_ENABLE_BUILDARTIFACTS_PLUS_SIGN_WORKAROUND.toLowerCase() === "true" : false;
            if (enableBuildArtifactsPlusSignWorkaround)
                artifactName = artifactName.replace(/\+/g, ' ');
            // pathToUpload is an actual folder or file that will get uploaded
            const pathToUpload = getPathToUploadAndCreateTarIfNeeded(pathToPublish, shouldStoreAsTar, artifactName);
            let artifactType = tl.getInput('ArtifactType', true);
            let hostType = tl.getVariable('system.hostType');
            if ((hostType && hostType.toUpperCase() != 'BUILD') && (artifactType.toUpperCase() !== "FILEPATH")) {
                tl.setResult(tl.TaskResult.Failed, tl.loc('ErrorHostTypeNotSupported'));
                return;
            }
            artifactType = artifactType.toLowerCase();
            let data = {
                artifacttype: artifactType,
                artifactname: artifactName
            };
            let maxArtifactSize = getMaxArtifactSize();
            if (maxArtifactSize != 0) {
                let artifactSize = getArtifactSize(pathToUpload);
                if (artifactSize > maxArtifactSize) {
                    tl.warning(tl.loc('ArtifactSizeExceeded', artifactSize, maxArtifactSize));
                }
            }
            // upload or copy
            if (artifactType === "container") {
                data["containerfolder"] = artifactName;
                // add localpath to ##vso command's properties for back compat of old Xplat agent
                data["localpath"] = pathToUpload;
                tl.command("artifact.upload", data, pathToUpload);
            }
            else if (artifactType === "filepath") {
                let targetPath = tl.getInput('TargetPath', true);
                let artifactPath = path.join(targetPath, artifactName);
                data['artifactlocation'] = targetPath; // artifactlocation for back compat with old xplat agent
                if (os.platform() == 'win32') {
                    tl.mkdirP(artifactPath);
                    // create the artifact. at this point, mkdirP already succeeded so the path is good.
                    // the artifact should get cleaned up during retention even if the copy fails in the
                    // middle
                    tl.command("artifact.associate", data, targetPath);
                    let parallel = tl.getBoolInput('Parallel', false);
                    let parallelCount = 1;
                    if (parallel) {
                        parallelCount = getParallelCount();
                    }
                    // copy the files
                    let script = path.join(__dirname, 'Invoke-Robocopy.ps1');
                    let command = `& ${pathToScriptPSString(script)} -Source ${pathToRobocopyPSString(pathToUpload)} -Target ${pathToRobocopyPSString(artifactPath)} -ParallelCount ${parallelCount}`;
                    if (tl.stats(pathToUpload).isFile()) {
                        let parentFolder = path.dirname(pathToUpload);
                        let file = path.basename(pathToUpload);
                        command = `& ${pathToScriptPSString(script)} -Source ${pathToRobocopyPSString(parentFolder)} -Target ${pathToRobocopyPSString(artifactPath)} -ParallelCount ${parallelCount} -File '${file}'`;
                    }
                    let powershell = new tr.ToolRunner('powershell.exe');
                    powershell.arg('-NoLogo');
                    powershell.arg('-Sta');
                    powershell.arg('-NoProfile');
                    powershell.arg('-NonInteractive');
                    powershell.arg('-ExecutionPolicy');
                    powershell.arg('Unrestricted');
                    powershell.arg('-Command');
                    powershell.arg(command);
                    powershell.on('stdout', (buffer) => {
                        process.stdout.write(buffer);
                    });
                    powershell.on('stderr', (buffer) => {
                        process.stderr.write(buffer);
                    });
                    let execOptions = { silent: true };
                    yield powershell.exec(execOptions);
                }
                else {
                    // file share artifacts are not currently supported on OSX/Linux.
                    tl.setResult(tl.TaskResult.Failed, tl.loc('ErrorFileShareLinux'));
                    return;
                }
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, tl.loc('PublishBuildArtifactsFailed', err.message));
        }
    });
}
function getParallelCount() {
    let result = 8;
    let inputValue = tl.getInput('ParallelCount', false);
    if (Number.isNaN(Number(inputValue))) {
        tl.warning(tl.loc('UnexpectedParallelCount', inputValue));
    }
    else {
        let parsedInput = parseInt(inputValue);
        if (parsedInput < 1) {
            tl.warning(tl.loc('UnexpectedParallelCount', parsedInput));
            result = 1;
        }
        else if (parsedInput > 128) {
            tl.warning(tl.loc('UnexpectedParallelCount', parsedInput));
            result = 128;
        }
        else {
            result = parsedInput;
        }
    }
    return result;
}
function getMaxArtifactSize() {
    let result = 0;
    let inputValue = tl.getInput('MaxArtifactSize', false);
    if (!(Number.isNaN(Number(inputValue)))) {
        result = parseInt(inputValue);
    }
    return result;
}
function getArtifactSize(pathToUpload) {
    let totalSize = 0;
    if (tl.stats(pathToUpload).isFile()) {
        totalSize = tl.stats(pathToUpload).size;
    }
    else if (tl.stats(pathToUpload).isDirectory()) {
        const files = fs.readdirSync(pathToUpload);
        files.forEach(file => {
            totalSize = totalSize + getArtifactSize(path.join(pathToUpload, file));
        });
    }
    return totalSize;
}
run();
