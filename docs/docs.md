# Introduction

Polaris Software Integrity Platform for Azure DevOps helps security and development teams analyze security risks in their software products. The plugin enables you to invoke the Polaris Software Integrity Platform CLI from your Azure pipelines.

The plugin will download and install a Polaris Software Integrity Platform CLI and execute it using the Polaris Software Integrity Platform YAML file checked into source. The Polaris Software Integrity Platform CLI will analyze your project and upload the results to Polaris Software Integrity Platform. The plugin can then check for issues and fail the build if issues are found. 

# Requirements 
* Access to the internet
* Azure DevOps Services or Azure DevOps Server 17 or greater (older versions may still work)
* Polaris Software Integrity Platform version 2020.03 or later, and a valid access token
* Ensure that the Polaris Software Integrity Platform CLI can run successfully on the project and that the polaris.yml file is checked into source.

# Installation
An administrator must install the plugin from the Azure Marketplace. For information about installing and updating plugins refer to the [Microsoft documentation](https://docs.microsoft.com/en-us/azure/devops/marketplace/install-extension?view=azure-devops&tabs=browser).

# Configuration

The plugin can be added to an existing pipeline following the normal Azure processes. For information on adding a task see [Microsoft's documentation](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops). 

After adding the Polaris Software Integrity Platform task, select or create a new Polaris Software Integrity Platform Server Connection. Enter the Polaris Software Integrity Platform url and the access token. If a proxy is required enter the proxy url and credentials. 

Enter the Polaris Software Integrity Platform build command such as "analyze". You do not need to wait (add "-w") even if you are checking for issues. 

Select Wait for Issues if you would like the build to fail if issues are found. 

Note: To share service connections see the [Microsoft documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#project-permissions---cross-project-sharing-of-service-connections).

# Co Arguments

Polaris Software Integrity Platform supports --co arguments and the plugin supports passing these arguments to Polaris Software Integrity Platform. However care must be taken to properly escape --co arguments in the plugin. 

The argument itself (but not --co) should be wrapped in quotes. `--co "argument=value"` 

All quotes in the argument should be escaped with backslash quote and all backslashes should be escaped with double backslashes. `--co "argument=value \"with\" quotes and \\backslash\\ example"`

The escaping of --co argument="value" approach should not be used - Azure separates arguments by quotes, so this creates a superfluous extra argument that Polaris Software Integrity Platform does not understand. 

A full example co command might resemble:
```
--co "capture.build.cleanCommands=[{\"shell\":[\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\MSBuild\\15.0\\Bin\\msbuild.exe\",\"WebGoat.NET.sln\",\"/t:Clean\"]}]" --co capture.build.buildCommands="[{\"shell\":[\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\MSBuild\\15.0\\Bin\\msbuild.exe\",\"WebGoat.NET.sln\",\"/nologo\",\"/nr:false\",\"/t:Build\",\"/p:platform=any cpu\",\"/p:configuration=release\",\"/p:VisualStudioVersion=15.0\"]}]" analyze
```

# Agent Configuration

Generally, the plugin should control the Polaris Software Integrity Platform download and will place the download in the Tool Directory of the Agent. A Polaris Software Integrity Platform CLI can be provided to the plugin, but the CLI must be installed to the tool directory inside a folder named "polaris" and a version file "version.txt" must be created with the datetime, for example "2020-06-16T19:49:48-04:00", of the downloaded CLI as it's only contents. The cli should be extracted to this folder, and the folder name must match the pattern from the Polaris Software Integrity Platform Server, for example "polaris_cli-win64-1.8.102". The plugin will still attempt to download new versions of the CLI if they become available. 

POLARIS_HOME can be overridden with an environment variable. If no POLARIS_HOME is specified, the plugin will create the folder ".synopsys/polaris" inside the Tool Directory and create the folder if it does not exist.

# Incremental Analysis 

The extension can generate a set of changed files that the Polaris Software Integrity Platform CLI can use when in incremental mode.

The extension can only generate change set files for projects that use Git as their version control system.   

When enabled, a file is generated at the location specified by the environment variable CHANGE_SET_FILE_PATH. If the environment variable is not set, a default of ".synopsys/polaris/changeSetFile.txt" will be set by the extension.

The extension will replace any instance of "$CHANGE_SET_FILE_PATH" in the build command with the environment variable. 

For example a typical build command for incremental analysis would look like this: 
```
analyze --incremental $CHANGE_SET_FILE_PATH
```

The extension requires the OAuth Token as it uses the Azure Api to find the last successful build. If System.AccessToken is not set, but generate change set file is, the plugin will fail.

The OAuth token can be enabled when editing the pipeline by selecting the Agent -> Additional Options -> "Allow scripts access to the OAuth token". As shown [here](OAuth.PNG). 
The OAuth token can also be provided through the Azure variable "System.AccessToken".
 
By default, the Polaris Software Integrity Platform CLI will install local analysis tools. These tools are over 3GB in size.
It is recommended to install these tools before running the CLI and specify the tools location in your polaris.yml file.

A typical installation can be specified in the yaml file: 
```
install:
  coverity:
    version: "2020.09"
    directory: "C:\\.synopsys\\polaris\\coverity-analysis-tools\\cov_analysis-win64-2020.09"
```
 
If the CLI does attempt to install these tools, the default pipeline timeout will most likely need to be increased from 60 minutes. 

Note that the extension sets POLARIS_FF_ENABLE_COVERITY_INCREMENTAL=true when generate change set is enabled.

In the case where the set of changed files is empty, the task will not run the CLI and can be configured to either Succeed or Fail. 
