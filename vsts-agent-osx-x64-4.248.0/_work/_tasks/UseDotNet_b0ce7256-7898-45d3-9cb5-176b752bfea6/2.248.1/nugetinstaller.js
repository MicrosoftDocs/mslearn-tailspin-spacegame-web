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
exports.NuGetInstaller = void 0;
const tl = require("azure-pipelines-task-lib/task");
const nuGetGetter = require("azure-pipelines-tasks-packaging-common/nuget/NuGetToolGetter");
class NuGetInstaller {
    static installNuGet(version) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const proxy = tl.getHttpProxyConfiguration();
                if (proxy) {
                    console.log(tl.loc("InstallingNuGetVersion", version));
                    yield nuGetGetter.getNuGet(version, false, true);
                    NuGetInstaller.setProxy(proxy);
                }
            }
            catch (error) {
                console.warn(tl.loc("FailureWhileInstallingNuGetVersion", version, error.message));
            }
        });
    }
    static setProxy(proxyConfig) {
        const nugetPath = tl.which('nuget');
        console.log(tl.loc("SettingUpNugetProxySettings"));
        // Set proxy url
        let nuget = tl.tool(nugetPath);
        nuget.arg('config');
        nuget.arg('-set');
        nuget.arg('http_proxy=' + proxyConfig.proxyUrl);
        nuget.execSync({});
        // Set proxy username
        nuget = tl.tool(nugetPath);
        nuget.arg('config');
        nuget.arg('-set');
        nuget.arg('http_proxy.user=' + proxyConfig.proxyUsername);
        nuget.execSync({});
        // Set proxy password
        nuget = tl.tool(nugetPath);
        nuget.arg('config');
        nuget.arg('-set');
        nuget.arg('http_proxy.password=' + proxyConfig.proxyPassword);
        nuget.execSync({});
        // Set no_proxy
        if (proxyConfig.proxyBypassHosts) {
            nuget = tl.tool(nugetPath);
            nuget.arg('config');
            nuget.arg('-set');
            nuget.arg('no_proxy=' + proxyConfig.proxyBypassHosts.join(','));
            nuget.execSync({});
        }
    }
}
exports.NuGetInstaller = NuGetInstaller;
