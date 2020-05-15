
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

    async execute_cli(cliPath: string, cwd: string, url: string, token: string):Promise<PolarisCliResult> {
        var env: {
            [key: string]: string;
        } = {
            POLARIS_SERVER_URL: url,
            POLARIS_ACCESS_TOKEN: token
        }
    
        let go: tr.ToolRunner = tl.tool(cliPath);
        go.arg("analyze");
        //go.arg(this.command);
        //go.line(this.argument);
    
        var return_code = await go.exec(<tr.IExecOptions>{
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
