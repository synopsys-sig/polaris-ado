# polaris-ado
Polaris for Azure DevOps.

Build with:
npm run build
npm run test

tfx extension create --manifest-globs vss-extension.json
cd coverityTask && powershell ./compile_and_test.ps1 && cd ..

For a new version, change the task:
task.json, version: major/minor/patch
vss-extension.json, version