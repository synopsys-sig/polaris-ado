## Overview ##

Polaris Extension for Azure DevOps
Synopsys Polaris helps security and development teams analyze security risks in their software products. The Synopsys Polaris Extension for Azure DevOps enables you to invoke Synopsys Polaris analysis from your Azure DevOps pipelines. 

When the Synopsys Polaris for Azure DevOps runs, it checks the configured Synopsys Polaris server and the Azure DevOps agent to see if the correct version of the Synopsys Polaris Command Line Interpreter (CLI) is installed. If the Synopsys Polaris CLI is not installed, the plugin installs the CLI. In either case, the extension then executes the Synopsys Polaris CLI, which analyzes your project, and uploads results to the Synopsys Polaris Software Integrity Platform.

As a Synopsys and Azure DevOps user, the Synopsys Polaris Extension for Azure DevOps enables you to:
1. Run an automatic Polaris scan through an Azure DevOps pipeline job
2. After a scan is complete, the results are available on the Synopsys Polaris server
3. If issues are found, the extension can fail the build


