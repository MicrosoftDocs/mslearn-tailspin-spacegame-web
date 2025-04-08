#!/bin/bash
set -e

# Use a newer agent version that satisfies the requirement (greater than 2.163.1)
# The version in your Dockerfile is 2.206.1, so let's use that
if [ -z "$AZP_AGENT_VERSION" ]; then
  AZP_AGENT_VERSION=2.206.1
fi

# Verify Azure Pipelines token is set
if [ -z "$AZP_TOKEN" ]; then
  echo 1>&2 "error: missing AZP_TOKEN environment variable"
  exit 1
fi

# Verify Azure DevOps URL is set
if [ -z "$AZP_URL" ]; then
  echo 1>&2 "error: missing AZP_URL environment variable"
  exit 1
fi

# If a working directory was specified, create that directory
if [ -n "$AZP_WORK" ]; then
  mkdir -p "$AZP_WORK"
fi

# Create the Downloads directory under the user's home directory
if [ -n "$HOME/Downloads" ]; then
  mkdir -p "$HOME/Downloads"
fi

# Download the agent package
echo "Downloading Azure Pipelines agent version $AZP_AGENT_VERSION..."
curl -L https://vstsagentpackage.azureedge.net/agent/$AZP_AGENT_VERSION/vsts-agent-linux-x64-$AZP_AGENT_VERSION.tar.gz > $HOME/Downloads/vsts-agent-linux-x64-$AZP_AGENT_VERSION.tar.gz

# Create the working directory for the agent service to run jobs under
if [ -n "$AZP_WORK" ]; then
  mkdir -p "$AZP_WORK"
fi

# Create a working directory to extract the agent package to
mkdir -p $HOME/azp/agent

# Move to the working directory
cd $HOME/azp/agent

# Extract the agent package to the working directory
echo "Extracting agent package..."
tar zxf $HOME/Downloads/vsts-agent-linux-x64-$AZP_AGENT_VERSION.tar.gz

# Install the agent dependencies
echo "Installing agent dependencies..."
# Add Microsoft package repository for .NET dependencies if needed
if ! dpkg -l | grep -q liblttng-ust; then
  echo "Adding Microsoft package repository for .NET dependencies..."
  apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
  curl -fsSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -o packages-microsoft-prod.deb
  dpkg -i packages-microsoft-prod.deb
  rm packages-microsoft-prod.deb
  apt-get update
  apt-get install -y liblttng-ust1 libicu-dev
  apt-get clean
fi

# Run the installdependencies.sh script with error handling
if [ -f ./bin/installdependencies.sh ]; then
  echo "Running installdependencies.sh..."
  ./bin/installdependencies.sh || echo "Warning: Some dependencies might not have been installed correctly."
fi

# Configure the agent as the sudo (non-root) user
echo "Configuring agent..."
if [ -n "$SUDO_USER" ]; then
  chown -R $SUDO_USER $HOME/azp/agent
  sudo -u $SUDO_USER ./config.sh --unattended \
    --agent "${AZP_AGENT_NAME:-$(hostname)}" \
    --url "$AZP_URL" \
    --auth PAT \
    --token "$AZP_TOKEN" \
    --pool "${AZP_POOL:-Default}" \
    --work "${AZP_WORK:-_work}" \
    --replace \
    --acceptTeeEula
else
  # If not running with sudo, configure directly
  ./config.sh --unattended \
    --agent "${AZP_AGENT_NAME:-$(hostname)}" \
    --url "$AZP_URL" \
    --auth PAT \
    --token "$AZP_TOKEN" \
    --pool "${AZP_POOL:-Default}" \
    --work "${AZP_WORK:-_work}" \
    --replace \
    --acceptTeeEula
fi

# Install and start the agent service
echo "Installing and starting agent service..."
./svc.sh install
./svc.sh start

echo "Azure Pipelines agent has been configured and started successfully."