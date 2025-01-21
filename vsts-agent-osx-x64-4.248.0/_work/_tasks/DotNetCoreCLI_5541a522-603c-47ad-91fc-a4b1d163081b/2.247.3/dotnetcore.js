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
exports.dotNetExe = void 0;
const tl = require("azure-pipelines-task-lib/task");
const path = require("path");
const fs = require("fs");
const ltx = require("ltx");
var archiver = require('archiver');
var uuidV4 = require('uuid/v4');
const nodeVersion = parseInt(process.version.split('.')[0].replace('v', ''));
if (nodeVersion > 16) {
    require("dns").setDefaultResultOrder("ipv4first");
    tl.debug("Set default DNS lookup order to ipv4 first");
}
if (nodeVersion > 19) {
    require("net").setDefaultAutoSelectFamily(false);
    tl.debug("Set default auto select family to false");
}
const packCommand = require("./packcommand");
const pushCommand = require("./pushcommand");
const restoreCommand = require("./restorecommand");
const utility = require("./Common/utility");
const telemetry = require("azure-pipelines-tasks-utility-common/telemetry");
class dotNetExe {
    constructor() {
        this.outputArgument = "";
        this.outputArgumentIndex = 0;
        this.testRunSystem = "VSTS - dotnet";
        this.command = tl.getInput("command");
        this.projects = tl.getDelimitedInput("projects", "\n", false);
        this.arguments = tl.getInput("arguments", false) || "";
        this.publishWebProjects = tl.getBoolInput("publishWebProjects", false);
        this.zipAfterPublish = tl.getBoolInput("zipAfterPublish", false);
        this.workingDirectory = tl.getPathInput("workingDirectory", false);
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            tl.setResourcePath(path.join(__dirname, "task.json"));
            this.setConsoleCodePage();
            this.setUpConnectedServiceEnvironmentVariables();
            try {
                switch (this.command) {
                    case "build":
                    case "publish":
                    case "run":
                        yield this.executeBasicCommand();
                        break;
                    case "custom":
                        this.command = tl.getInput("custom", true);
                        yield this.executeBasicCommand();
                        break;
                    case "test":
                        yield this.executeTestCommand();
                        break;
                    case "restore":
                        this.logRestoreStartUpVariables();
                        yield restoreCommand.run();
                        break;
                    case "pack":
                        yield packCommand.run();
                        break;
                    case "push":
                        yield pushCommand.run();
                        break;
                    default:
                        throw tl.loc("Error_CommandNotRecognized", this.command);
                }
            }
            finally {
                console.log(tl.loc('Net5Update'));
            }
        });
    }
    setConsoleCodePage() {
        // set the console code page to "UTF-8"
        if (tl.osType() === 'Windows_NT') {
            try {
                tl.execSync(path.resolve(process.env.windir, "system32", "chcp.com"), ["65001"]);
            }
            catch (ex) {
                tl.warning(tl.loc("CouldNotSetCodePaging", JSON.stringify(ex)));
            }
        }
    }
    executeBasicCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            var dotnetPath = tl.which("dotnet", true);
            console.log(tl.loc('DeprecatedDotnet2_2_And_3_0'));
            this.extractOutputArgument();
            // Use empty string when no project file is specified to operate on the current directory
            var projectFiles = this.getProjectFiles();
            if (projectFiles.length === 0) {
                throw tl.loc("noProjectFilesFound");
            }
            var failedProjects = [];
            for (const fileIndex of Object.keys(projectFiles)) {
                var projectFile = projectFiles[fileIndex];
                var dotnet = tl.tool(dotnetPath);
                dotnet.arg(this.command);
                if (this.isRunCommand()) {
                    if (!!projectFile) {
                        dotnet.arg("--project");
                        dotnet.arg(projectFile);
                    }
                }
                else {
                    dotnet.arg(projectFile);
                }
                if (this.isBuildCommand()) {
                    var loggerAssembly = path.join(__dirname, 'dotnet-build-helpers/Microsoft.TeamFoundation.DistributedTask.MSBuild.Logger.dll');
                    dotnet.arg(`-dl:CentralLogger,\"${loggerAssembly}\"*ForwardingLogger,\"${loggerAssembly}\"`);
                }
                var dotnetArguments = this.arguments;
                if (this.isPublishCommand() && this.outputArgument && tl.getBoolInput("modifyOutputPath")) {
                    var output = dotNetExe.getModifiedOutputForProjectFile(this.outputArgument, projectFile);
                    dotnetArguments = this.replaceOutputArgument(output);
                }
                dotnet.line(dotnetArguments);
                try {
                    var result = yield dotnet.exec({
                        cwd: this.workingDirectory
                    });
                    yield this.zipAfterPublishIfRequired(projectFile);
                }
                catch (err) {
                    tl.error(err);
                    failedProjects.push(projectFile);
                }
            }
            if (failedProjects.length > 0) {
                if (this.command === 'build' || this.command === 'publish' || this.command === 'run') {
                    tl.warning(tl.loc('Net5NugetVersionCompat'));
                }
                throw tl.loc("dotnetCommandFailed", failedProjects);
            }
        });
    }
    executeTestCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const dotnetPath = tl.which('dotnet', true);
            console.log(tl.loc('DeprecatedDotnet2_2_And_3_0'));
            const enablePublishTestResults = tl.getBoolInput('publishTestResults', false) || false;
            const resultsDirectory = tl.getVariable('Agent.TempDirectory');
            if (enablePublishTestResults && enablePublishTestResults === true) {
                this.arguments = ` --logger trx --results-directory "${resultsDirectory}" `.concat(this.arguments);
            }
            // Remove old trx files
            if (enablePublishTestResults && enablePublishTestResults === true) {
                this.removeOldTestResultFiles(resultsDirectory);
            }
            // Use empty string when no project file is specified to operate on the current directory
            const projectFiles = this.getProjectFiles();
            if (projectFiles.length === 0) {
                tl.warning(tl.loc('noProjectFilesFound'));
                return;
            }
            const failedProjects = [];
            for (const fileIndex of Object.keys(projectFiles)) {
                const projectFile = projectFiles[fileIndex];
                const dotnet = tl.tool(dotnetPath);
                dotnet.arg(this.command);
                dotnet.arg(projectFile);
                dotnet.line(this.arguments);
                try {
                    const result = yield dotnet.exec({
                        cwd: this.workingDirectory
                    });
                }
                catch (err) {
                    tl.error(err);
                    failedProjects.push(projectFile);
                }
            }
            if (enablePublishTestResults && enablePublishTestResults === true) {
                this.publishTestResults(resultsDirectory);
            }
            if (failedProjects.length > 0) {
                tl.warning(tl.loc('Net5NugetVersionCompat'));
                throw tl.loc('dotnetCommandFailed', failedProjects);
            }
        });
    }
    publishTestResults(resultsDir) {
        const buildConfig = tl.getVariable('BuildConfiguration');
        const buildPlaform = tl.getVariable('BuildPlatform');
        const testRunTitle = tl.getInput("testRunTitle", false) || "";
        const matchingTestResultsFiles = tl.findMatch(resultsDir, '**/*.trx');
        if (!matchingTestResultsFiles || matchingTestResultsFiles.length === 0) {
            tl.warning('No test result files were found.');
        }
        else {
            const tp = new tl.TestPublisher('VSTest');
            tp.publish(matchingTestResultsFiles, 'false', buildPlaform, buildConfig, testRunTitle, 'true', this.testRunSystem);
            //refer https://github.com/Microsoft/vsts-task-lib/blob/master/node/task.ts#L1620
        }
    }
    removeOldTestResultFiles(resultsDir) {
        const matchingTestResultsFiles = tl.findMatch(resultsDir, '**/*.trx');
        if (!matchingTestResultsFiles || matchingTestResultsFiles.length === 0) {
            tl.debug("No old result files found.");
            return;
        }
        for (const fileIndex of Object.keys(matchingTestResultsFiles)) {
            const resultFile = matchingTestResultsFiles[fileIndex];
            tl.rmRF(resultFile);
            tl.debug("Successfuly removed: " + resultFile);
        }
    }
    replaceOutputArgument(modifiedOutput) {
        var str = this.arguments;
        var index = this.outputArgumentIndex;
        return str.substr(0, index) + str.substr(index).replace(this.outputArgument, modifiedOutput);
    }
    zipAfterPublishIfRequired(projectFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isPublishCommand() && this.zipAfterPublish) {
                var outputSource = "";
                var moveZipToOutputSource = false;
                if (this.outputArgument) {
                    if (tl.getBoolInput("modifyOutputPath") && projectFile) {
                        outputSource = dotNetExe.getModifiedOutputForProjectFile(this.outputArgument, projectFile);
                    }
                    else {
                        outputSource = this.outputArgument;
                        moveZipToOutputSource = true;
                    }
                }
                else {
                    var pattern = "**/publish";
                    var files = tl.findMatch(path.dirname(projectFile), pattern);
                    for (var fileIndex in files) {
                        var file = files[fileIndex];
                        if (fs.lstatSync(file).isDirectory) {
                            outputSource = file;
                            break;
                        }
                    }
                }
                tl.debug("Zip Source: " + outputSource);
                if (outputSource) {
                    var outputTarget = outputSource + ".zip";
                    yield this.zip(outputSource, outputTarget);
                    tl.rmRF(outputSource);
                    if (moveZipToOutputSource) {
                        fs.mkdirSync(outputSource);
                        fs.renameSync(outputTarget, path.join(outputSource, path.basename(outputTarget)));
                    }
                }
                else {
                    throw tl.loc("noPublishFolderFoundToZip", projectFile);
                }
            }
        });
    }
    zip(source, target) {
        tl.debug("Zip arguments: Source: " + source + " , target: " + target);
        return new Promise((resolve, reject) => {
            var output = fs.createWriteStream(target);
            output.on('close', function () {
                tl.debug('Successfully created archive ' + target);
                resolve(target);
            });
            output.on('error', function (error) {
                reject(error);
            });
            var archive = archiver('zip');
            archive.pipe(output);
            archive.directory(source, '/');
            archive.finalize();
        });
    }
    extractOutputArgument() {
        if (!this.arguments || !this.arguments.trim()) {
            return;
        }
        var argString = this.arguments.trim();
        var isOutputOption = false;
        var inQuotes = false;
        var escaped = false;
        var arg = '';
        var i = 0;
        var append = function (c) {
            // we only escape double quotes.
            if (escaped && c !== '"') {
                arg += '\\';
            }
            arg += c;
            escaped = false;
        };
        var nextArg = function () {
            arg = '';
            for (; i < argString.length; i++) {
                var c = argString.charAt(i);
                if (c === '"') {
                    if (!escaped) {
                        inQuotes = !inQuotes;
                    }
                    else {
                        append(c);
                    }
                    continue;
                }
                if (c === "\\" && inQuotes && !escaped) {
                    escaped = true;
                    continue;
                }
                if (c === ' ' && !inQuotes) {
                    if (arg.length > 0) {
                        return arg.trim();
                    }
                    continue;
                }
                append(c);
            }
            if (arg.length > 0) {
                return arg.trim();
            }
            return null;
        };
        var token = nextArg();
        while (token) {
            var tokenUpper = token.toUpperCase();
            if (this.isPublishCommand() && (tokenUpper === "--OUTPUT" || tokenUpper === "-O")) {
                isOutputOption = true;
                this.outputArgumentIndex = i;
            }
            else if (isOutputOption) {
                this.outputArgument = token;
                isOutputOption = false;
            }
            token = nextArg();
        }
    }
    getProjectFiles() {
        var projectPattern = this.projects;
        var searchWebProjects = this.isPublishCommand() && this.publishWebProjects;
        if (searchWebProjects) {
            projectPattern = ["**/*.csproj", "**/*.vbproj", "**/*.fsproj"];
        }
        var projectFiles = utility.getProjectFiles(projectPattern);
        var resolvedProjectFiles = [];
        if (searchWebProjects) {
            resolvedProjectFiles = projectFiles.filter(function (file, index, files) {
                var directory = path.dirname(file);
                return tl.exist(path.join(directory, "web.config"))
                    || tl.exist(path.join(directory, "wwwroot"));
            });
            if (!resolvedProjectFiles.length) {
                var projectFilesUsingWebSdk = projectFiles.filter(this.isWebSdkUsed);
                if (!projectFilesUsingWebSdk.length) {
                    tl.error(tl.loc("noWebProjectFound"));
                }
                return projectFilesUsingWebSdk;
            }
            return resolvedProjectFiles;
        }
        return projectFiles;
    }
    isWebSdkUsed(projectfile) {
        if (projectfile.endsWith('.vbproj'))
            return false;
        try {
            var fileBuffer = fs.readFileSync(projectfile);
            var webConfigContent;
            var fileEncodings = ['utf8', 'utf16le'];
            for (var i = 0; i < fileEncodings.length; i++) {
                tl.debug("Trying to decode with " + fileEncodings[i]);
                webConfigContent = fileBuffer.toString(fileEncodings[i]);
                try {
                    var projectSdkUsed = ltx.parse(webConfigContent).getAttr("sdk") || ltx.parse(webConfigContent).getAttr("Sdk");
                    return projectSdkUsed && projectSdkUsed.toLowerCase() == "microsoft.net.sdk.web";
                }
                catch (error) { }
            }
        }
        catch (error) {
            tl.warning(error);
        }
        return false;
    }
    isBuildCommand() {
        return this.command === "build";
    }
    isPublishCommand() {
        return this.command === "publish";
    }
    isRunCommand() {
        return this.command === "run";
    }
    static getModifiedOutputForProjectFile(outputBase, projectFile) {
        return path.join(outputBase, path.basename(path.dirname(projectFile)));
    }
    logRestoreStartUpVariables() {
        try {
            const nugetfeedtype = tl.getInput("nugetfeedtype");
            let externalendpoint = null;
            if (nugetfeedtype != null && nugetfeedtype === "external") {
                const epId = tl.getInput("externalendpoint");
                if (epId) {
                    externalendpoint = {
                        feedName: tl.getEndpointUrl(epId, false).replace(/\W/g, ""),
                        feedUri: tl.getEndpointUrl(epId, false),
                    };
                }
            }
            let externalendpoints = tl.getDelimitedInput("externalendpoints", ",");
            if (externalendpoints) {
                externalendpoints = externalendpoints.reduce((ary, id) => {
                    const te = {
                        feedName: tl.getEndpointUrl(id, false).replace(/\W/g, ""),
                        feedUri: tl.getEndpointUrl(id, false),
                    };
                    ary.push(te);
                    return ary;
                }, []);
            }
            const nugetTelem = {
                "command": tl.getInput("command"),
                "System.TeamFoundationCollectionUri": tl.getVariable("System.TeamFoundationCollectionUri"),
                "includenugetorg": tl.getInput("includenugetorg"),
                "nocache": tl.getInput("nocache"),
                "nugetconfigpath": tl.getInput("nugetconfigpath"),
                "nugetfeedtype": nugetfeedtype,
                "selectorconfig": tl.getInput("selectorconfig"),
                "projects": tl.getInput("projects"),
                "verbosityrestore": tl.getInput("verbosityrestore")
            };
            telemetry.emitTelemetry("Packaging", "DotNetCoreCLIRestore", nugetTelem);
        }
        catch (err) {
            tl.debug(`Unable to log NuGet task init telemetry. Err:( ${err} )`);
        }
    }
    setUpConnectedServiceEnvironmentVariables() {
        var connectedService = tl.getInput('ConnectedServiceName');
        if (connectedService) {
            var authScheme = tl.getEndpointAuthorizationScheme(connectedService, false);
            if (authScheme && authScheme.toLowerCase() == "workloadidentityfederation") {
                process.env.AZURESUBSCRIPTION_SERVICE_CONNECTION_ID = connectedService;
                process.env.AZURESUBSCRIPTION_CLIENT_ID = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalid", false);
                process.env.AZURESUBSCRIPTION_TENANT_ID = tl.getEndpointAuthorizationParameter(connectedService, "tenantid", false);
                tl.debug('Environment variables AZURESUBSCRIPTION_SERVICE_CONNECTION_ID,AZURESUBSCRIPTION_CLIENT_ID and AZURESUBSCRIPTION_TENANT_ID are set');
            }
            else {
                tl.warning('Connected service is not of type Workload Identity Federation');
            }
        }
        else {
            tl.debug('No connected service set');
        }
    }
}
exports.dotNetExe = dotNetExe;
var exe = new dotNetExe();
exe.execute().catch((reason) => tl.setResult(tl.TaskResult.Failed, reason));
