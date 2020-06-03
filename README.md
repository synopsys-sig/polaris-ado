# polaris-ado
Polaris for Azure DevOps.

Install npm modules: npm install
Copy npm modules into task folder: cp node_modules tasks/polarisTask/node_modules

Build with: npm run build
Test with: npm run test

For a new version, change the task:
task.json, version: major/minor/patch
vss-extension.json, version