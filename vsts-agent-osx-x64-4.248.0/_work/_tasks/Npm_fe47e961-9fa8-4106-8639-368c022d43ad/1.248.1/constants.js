"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpmTaskInput = exports.RegistryLocation = exports.NpmCommand = void 0;
class NpmCommand {
}
exports.NpmCommand = NpmCommand;
NpmCommand.Install = 'install';
NpmCommand.ContinuousIntegration = 'ci';
NpmCommand.Publish = 'publish';
NpmCommand.Custom = 'custom';
class RegistryLocation {
}
exports.RegistryLocation = RegistryLocation;
RegistryLocation.Npmrc = 'useNpmrc';
RegistryLocation.Feed = 'useFeed';
RegistryLocation.External = 'useExternalRegistry';
class NpmTaskInput {
}
exports.NpmTaskInput = NpmTaskInput;
NpmTaskInput.Command = 'command';
NpmTaskInput.WorkingDir = 'workingDir';
NpmTaskInput.CustomCommand = 'customCommand';
NpmTaskInput.Verbose = 'verbose';
NpmTaskInput.CustomRegistry = 'customRegistry';
NpmTaskInput.CustomFeed = 'customFeed';
NpmTaskInput.CustomEndpoint = 'customEndpoint';
NpmTaskInput.PublishRegistry = 'publishRegistry';
NpmTaskInput.PublishFeed = 'publishFeed';
NpmTaskInput.PublishEndpoint = 'publishEndpoint';
