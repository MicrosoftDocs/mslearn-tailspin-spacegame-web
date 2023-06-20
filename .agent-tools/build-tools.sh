#!/bin/bash
set -e

# Select a default .NET version if one is not specified
if [ -z "$DOTNET_VERSION" ]; then
  DOTNET_VERSION=6.0.300
fi

# Add the Node.js PPA so that we can install the latest version
curl -sL https://deb.nodesource.com/setup_16.x | bash -

# Install Node.js and jq
apt-get install -y nodejs

apt-get install -y jq

# Install gulp
npm install -g gulp

# Change ownership of the .npm directory to the sudo (non-root) user
chown -R $SUDO_USER ~/.npm

# Install .NET as the sudo (non-root) user
sudo -i -u $SUDO_USER bash << EOF
curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin -c LTS -v $DOTNET_VERSION
EOF
