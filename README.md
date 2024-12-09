# [DEPRECATED] Coverity on Polaris for Azure DevOps.

**NOTE:** This plugin has been deprecated and will not be maintained. It will not work after Coverity on Polaris 2024.12.0 release. It is recommended that you migrate to our new [Black Duck Coverity on Polaris Extension](https://marketplace.visualstudio.com/items?itemName=blackduck.blackduck-coverity-on-polaris). Details can be found [here](https://documentation.blackduck.com/bundle/ci-integrations/page/topics/c_pol-ado-rel-notes.html).

Polaris Extension for Azure DevOps Synopsys Coverity on Polaris helps security and development teams analyze security risks in their software products. The Coverity on Polaris Extension for Azure DevOps enables you to invoke Coverity on Polaris analysis from your Azure DevOps pipelines.

# Development

Requires TFX-CLI and TypeScript: `npm i -g tfx-cli` and `npm install typescript`

Install npm modules: `npm install`

Copy npm modules into task folder: `cp node_modules tasks/polarisTask/node_modules`

Build with: `npm run build`

For a new version, make sure to change: `task.json` and `vss-extension.json`.

Combined script to execute the build and create the .vsix file from your project directory, after you have installed the TFX-CLI and TypeScript: 
```
cd tasks/polarisTask/ && sudo npm install && rm -rf node_modules && cd ../.. && sudo npm install && cp -r  node_modules/ tasks/polarisTask/node_modules && sudo npm run build
``` 

# Node

The latest `.vsix` is generated using `node v20.11.0` and `npm v10.2.4`.

# Azure Pipeline

The plugin in supported with Azure Agent version `v2.206.1` and above.

# Issue with the generated .vsix file
13/02/2024


With the fix of BD security issues which required updating Mocha dependency in `package.json` from `v5.0.0 to v10.3.0` (which has dependency on `chokidar v3.5.3`, which internally has dependency on `fsevents v2.3.2`), the generated `.vsix` file is getting some issue with the mime type inside `[Content_Types].xml` file. This issue is causing the extension to fail to upload in Azure DevOps. We'll try to address this as soon as possible.

In order to fix it, we have to execute the following command after the build:

```bash
unzip -p user.synopsys-coverity-on-polaris-#version.vsix '\[Content_Types\].xml' | sed 's/arm64):&#x9;//' > '[Content_Types].xml'
zip user.synopsys-coverity-on-polaris-#version.vsix '[Content_Types].xml'
```

