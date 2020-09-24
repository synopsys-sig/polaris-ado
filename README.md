# Polaris for Azure DevOps.

Polaris Extension for Azure DevOps Synopsys Polaris helps security and development teams analyze security risks in their software products. The Synopsys Polaris Extension for Azure DevOps enables you to invoke Synopsys Polaris analysis from your Azure DevOps pipelines.

# Development

Requires TFX-CLI and TypeScript: `npm i -g tfx-cli` and `npm install typescript`

Install npm modules: `npm install`

Copy npm modules into task folder: `cp node_modules tasks/polarisTask/node_modules`

Build with: `npm run build`

For a new version, make sure to change: task.json and vss-extension.json.
