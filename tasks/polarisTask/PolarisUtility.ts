
import * as os from 'os';
const winston = require("winston");
const axios = require('axios');
const moment = require("moment");
const CancelToken = axios.CancelToken;
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');
const json_path = require('jsonpath');

import PolarisClient from "./PolarisClient"
import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");

//Polaris_CLI_Installation
export default class PolarisUtility {
    log: any;
    constructor(log:any) {
        this.log = log;
    }

    determine_cli_relative_location(client: string) {
        var platform = os.platform();
        if (platform == "win32") {
            return "/api/tools/" + client + "_cli-win64.zip";
        } else if (platform == "darwin") {
            return "/api/tools/" + client + "_cli-macosx.zip";
        } else {
            return "/api/tools/" + client + "_cli-linux64.zip";
        }
    }

    determine_cli_executable_name(client: string) {
        var platform = os.platform();
        if (platform == "win32") {
            return client + ".exe";
        } else {
            return client;
        }
    }

    async find_executable(polaris_install: string, client: string): Promise<string> {
        var polarisInternalFolders = fs.readdirSync(polaris_install);
        var polarisFolder = path.join(polaris_install, polarisInternalFolders[0]);
        var bin = path.join(polarisFolder, "bin");
        var exe = path.join(bin, this.determine_cli_executable_name(client));
        if (fs.existsSync(exe)) {
            return exe;
        } else {
            throw new Error("Could not find polaris even after download.");
        }
    }

    async extract_cli(sourceZip: string, targetPath: string) {
        var zip = new zipper(sourceZip);
        await zip.extractAllTo(targetPath, /*overwrite*/ true);
    }

    async execute_cli(cliPath: string, cwd: string, url: string, token: string, build_command: string, override_home: string):Promise<PolarisCliResult> {
        var env: any = process.env;
        
        env["POLARIS_SERVER_URL"] = url;
        env["POLARIS_ACCESS_TOKEN"] = token;

        if ("POLARIS_HOME" in env) {
            this.log.info("A POLARIS_HOME exists, will not attempt to override.")    
        } else {
            
            if (!fs.existsSync(override_home)) {
                this.log.info("Creating plugin Polaris home: " + override_home)
                fse.ensureDirSync(override_home);
            } else {
                this.log.error("Unable to create POLARIS_HOME, try setting POLARIS_HOME on the agent.");
            }
            
            if (fs.existsSync(override_home)) {
                this.log.info("Set POLARIS_HOME to directory: " + override_home)
                env["POLARIS_HOME"] = override_home
            } else {
                this.log.error("Unable to create a POLARIS_HOME and env variable was not set. Will not override. Try creating POLARIS_HOME on the agent or ensuring agent has access.")
            }
        }

    
        let go = tl.tool(cliPath);
        go.line(build_command);
    
        var return_code =  await go.exec(<tr.IExecOptions>{
            cwd: cwd,
            env: env
        });

        var synopsysFolder = path.join(cwd, ".synopsys");
        var polarisFolder = path.join(synopsysFolder, "polaris");
        var scanJsonFile = path.join(polarisFolder, "cli-scan.json");

        return new PolarisCliResult(return_code, scanJsonFile);
    }
}

class PolarisCliResult {
    returnCode: Number;
    scanCliJsonPath: string;
    constructor(returnCode:Number, scanCliJsonPath:string) {
        this.returnCode = returnCode;
        this.scanCliJsonPath = scanCliJsonPath;
    }
}
