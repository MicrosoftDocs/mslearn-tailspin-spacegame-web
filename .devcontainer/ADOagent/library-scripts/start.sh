#start.sh
#!/bin/bash
# Pulled from GitHub Codespace secrets
ADO_ORG=$ADO_ORG
ADO_PAT=$ADO_PAT
ADO_POOL_NAME=$ADO_POOL_NAME

# Derived environment variables
HOSTNAME=$(hostname)
AGENT_SUFFIX="ADO-agent"
AGENT_NAME="${HOSTNAME}-${AGENT_SUFFIX}"
ADO_URL="https://dev.azure.com/${ADO_ORG}"

# !!!Ignore sensitive tokens from capabilities!!!
export VSO_AGENT_IGNORE=ADO_PAT,GH_TOKEN,GITHUB_CODESPACE_TOKEN,GITHUB_TOKEN

/home/vscode/azure-pipelines/config.sh --unattended \
--agent "${AGENT_NAME}" \
--url "${ADO_URL}" \
--auth PAT \
--token "${ADO_PAT}" \
--pool "${ADO_POOL_NAME}" \
--acceptTeeEula

/home/vscode/azure-pipelines/run.sh