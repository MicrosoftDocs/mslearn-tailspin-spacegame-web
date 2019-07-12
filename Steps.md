Run npm install to install the Node.js packages defined in package.json.

Run node-sass to convert Sass (.scss) files to CSS (.css) files.

Run gulp to minify JavaScript and CSS files.

Print build info to the wwwroot directory to help the QA team identify the build number and date.

Run dotnet restore to install the project's dependencies.

Run dotnet build to build the app under both Debug and Release configurations.

Run dotnet publish to package the application as a .zip file and copy the results to a network 
share for the QA team to pick up.

#!/bin/bash

# Install Node.js modules as defined in package.json.
npm install --quiet

# Compile Sass (.scss) files to standard CSS (.css).
node-sass Tailspin.SpaceGame.Web/wwwroot

# Minify JavaScript and CSS files.
gulp

# Print the date to wwwroot/buildinfo.txt.
echo `date` > Tailspin.SpaceGame.Web/wwwroot/buildinfo.txt

# Install the latest .NET packages the app depends on.
dotnet restore

# Build the app under the Debug configuration.
dotnet build --configuration Debug

# Publish the build to the /tmp directory.
dotnet publish --no-build --configuration Debug --output /tmp/Debug

# Build the app under the Release configuration.
dotnet build --configuration Release

# Publish the build to the /tmp directory.
dotnet publish --no-build --configuration Release --output /tmp/Release