"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestTimeout = exports.getProjectFiles = void 0;
const tl = require("azure-pipelines-task-lib/task");
function getProjectFiles(projectPattern) {
    if (projectPattern.length == 0) {
        return [""];
    }
    var projectFiles = tl.findMatch(tl.getVariable("System.DefaultWorkingDirectory") || process.cwd(), projectPattern);
    if (!projectFiles || !projectFiles.length) {
        return [];
    }
    return projectFiles;
}
exports.getProjectFiles = getProjectFiles;
function getRequestTimeout() {
    let timeout = 60000 * 5;
    const inputValue = tl.getInput('requestTimeout', false);
    if (!(Number.isNaN(Number(inputValue)))) {
        const maxTimeout = 60000 * 10;
        timeout = Math.min(parseInt(inputValue), maxTimeout);
    }
    return timeout;
}
exports.getRequestTimeout = getRequestTimeout;
