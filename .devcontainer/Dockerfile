FROM mcr.microsoft.com/devcontainers/dotnet:6.0

# Install NodeJS
# [Choice] Node.js version: none, lts/*, 18, 16, 14
ARG NODE_VERSION="16"
RUN if [ "${NODE_VERSION}" != "none" ]; then su vscode -c "umask 0002 && . /usr/local/share/nvm/nvm.sh && nvm install ${NODE_VERSION} 2>&1"; fi

# Install Gulp
RUN npm install --global gulp-cli

RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# [Optional] Install zsh
ARG INSTALL_ZSH="true"
# [Optional] Upgrade OS packages to their latest versions
ARG UPGRADE_PACKAGES="false"

# Install needed packages and setup non-root user. Use a separate RUN statement to add your own dependencies.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
COPY library-scripts/*.sh /tmp/library-scripts/
RUN bash /tmp/library-scripts/common-debian.sh "${INSTALL_ZSH}" "${USERNAME}" "${USER_UID}" "${USER_GID}" "${UPGRADE_PACKAGES}" "true" "true"

# Add Microsoft package repository for .NET dependencies
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -o packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y liblttng-ust1 libicu-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# cd into the user directory, download and unzip the Azure DevOps agent
RUN cd /home/vscode && mkdir azure-pipelines && cd azure-pipelines

# input Azure DevOps agent arguments
ARG ARCH="x64"
ARG AGENT_VERSION="2.206.1"

RUN cd /home/vscode/azure-pipelines \
    && curl -O -L https://vstsagentpackage.azureedge.net/agent/${AGENT_VERSION}/vsts-agent-linux-${ARCH}-${AGENT_VERSION}.tar.gz \
    && tar xzf /home/vscode/azure-pipelines/vsts-agent-linux-${ARCH}-${AGENT_VERSION}.tar.gz

# Create a simple script to replace installdependencies.sh
RUN echo '#!/bin/bash\necho "Dependencies already installed."' > /home/vscode/azure-pipelines/bin/installdependencies.sh \
    && chmod +x /home/vscode/azure-pipelines/bin/installdependencies.sh

# copy over the start.sh script
COPY library-scripts/start.sh /home/vscode/azure-pipelines/start.sh

# Create the script in the expected location for devcontainer.json
RUN mkdir -p /workspaces/mslearn-tailspin-spacegame-web/.devcontainer/library-scripts \
    && echo '#!/bin/bash\necho "Azure Pipelines environment is ready!"' > /workspaces/mslearn-tailspin-spacegame-web/.devcontainer/library-scripts/start.sh \
    && chmod +x /workspaces/mslearn-tailspin-spacegame-web/.devcontainer/library-scripts/start.sh

# Apply ownership of home folder
RUN chown -R vscode ~vscode

# make the script executable
RUN chmod +x /home/vscode/azure-pipelines/start.sh

# Clean up
RUN rm -rf /var/lib/apt/lists/* /tmp/library-scripts