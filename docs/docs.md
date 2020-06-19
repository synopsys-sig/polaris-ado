# Introduction

Polaris for Azure DevOps helps security and development teams analyze security risks in their software products. The plugin enables you to invoke the Polaris CLI from your Azure pipelines.

The plugin will download and install a Polaris CLI and execute it using the Polaris YAML file checked into source. The Polaris CLI will analyze your project and upload the results to Polaris. The plugin can then check for issues and fail the build if issues are found. 

# Requirements 
* Access to the internet
* Azure DevOps Services or Azure DevOps Server 17 or greater (older versions may still work)
* Polaris version 2020.03 or later, and a valid access token
* Ensure that the Polaris CLI can run successfully on the project and that the polaris.yml file is checked into source.

# Installation
An administrator must install the plugin from the Azure Marketplace. For information about installing and updating plugins refer to the [Microsoft documentation](https://docs.microsoft.com/en-us/azure/devops/marketplace/install-extension?view=azure-devops&tabs=browser).

# Configuration

The plugin can be added to an existing pipeline following the normal Azure processes. For information on adding a task see [Microsoft's documentation](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops). 

After adding the Polaris task, select or create a new Polaris Server Connection. Enter the polaris url and the access token. If a proxy is required enter the proxy url and credentials. 

Enter the polaris build command such as "analyze". You do not need to wait (add "-w") even if you are checking for issues. 

Select Wait for Issues if you would like the build to fail if issues are found. 

Note: To share service connections see the [Microsoft documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#project-permissions---cross-project-sharing-of-service-connections).

# Co Arguments

Polaris supports --co arguments and the plugin supports passing these arguments to Polaris. However care must be taken to properly escape --co arguments in the plugin. 

The argument itself (but not --co) should be wrapped in quotes. `--co "argument=value"` 

All quotes in the argument should be escaped with backslash quote and all backslashes should be escaped with double backslashes. `--co "argument=value \"with\" quotes and \\backslash\\ example"`

The escaping of --co argument="value" approach should not be used - Azure separates arguments by quotes, so this creates a superfluous extra argument that Polaris does not understand. 

A full example co command might resemble:
```
--co "capture.build.cleanCommands=[{\"shell\":[\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\MSBuild\\15.0\\Bin\\msbuild.exe\",\"WebGoat.NET.sln\",\"/t:Clean\"]}]" --co capture.build.buildCommands="[{\"shell\":[\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\MSBuild\\15.0\\Bin\\msbuild.exe\",\"WebGoat.NET.sln\",\"/nologo\",\"/nr:false\",\"/t:Build\",\"/p:platform=any cpu\",\"/p:configuration=release\",\"/p:VisualStudioVersion=15.0\"]}]" analyze
```

# Agent Configuration

Generally, the plugin should control the Polaris download and will place the download in the Tool Directory of the Agent. A Polaris CLI can be provided to the plugin, but the CLI must be installed to the tool directory inside a folder named "polaris" and a version file "version.txt" must be created with the datetime, for example "2020-06-16T19:49:48-04:00", of the downloaded CLI as it's only contents. The cli should be extracted to this folder, and the folder name must match the pattern from the Polaris Server, for example "polaris_cli-win64-1.8.102". The plugin will still attempt to download new versions of the CLI if they become available. 

POLARIS_HOME can be overridden with an environment variable. If no POLARIS_HOME is specified, the plugin will create the folder ".synopsys/polaris" inside the Tool Directory and create the folder if it does not exist.