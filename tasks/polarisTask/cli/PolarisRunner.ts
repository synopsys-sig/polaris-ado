import PolarisRunResult from "../model/PolarisRunResult";
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const urlParser = require('url');
import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");
import PolarisInstall from "../model/PolarisInstall";
import PolarisConnection from "../model/PolarisConnection";

export default class PolarisRunner {
    log: any;
    constructor(log:any) {
        this.log = log;
    }

    async execute_cli(connection: PolarisConnection, polaris_install: PolarisInstall, cwd: string, build_command: string):Promise<PolarisRunResult> {
        var env: any = process.env;
        
        env["POLARIS_SERVER_URL"] = connection.url;
        env["POLARIS_ACCESS_TOKEN"] = connection.token;

        if (connection.proxy != undefined) {
            var proxyOpts = urlParser.parse(connection.proxy.proxy_url);
            if (connection.proxy.proxy_username && connection.proxy.proxy_password) {
                proxyOpts.auth = connection.proxy.proxy_username + ":" + connection.proxy.proxy_password;
            }
            env["HTTPS_PROXY"] = urlParser.format(proxyOpts);
        }

        if ("POLARIS_HOME" in env) {
            this.log.info("A POLARIS_HOME exists, will not attempt to override.")    
        } else {
            var override_home = polaris_install.polaris_home;
            if (!fs.existsSync(override_home)) {
                this.log.info("Creating plugin Polaris home: " + override_home)
                fse.ensureDirSync(override_home);
            } else {
                this.log.debug("Polaris home already exists, it will not be created.")
            }
            
            if (fs.existsSync(override_home)) {
                this.log.info("Set POLARIS_HOME to directory: " + override_home)
                env["POLARIS_HOME"] = override_home
            } else {
                this.log.error("Unable to create a POLARIS_HOME and env variable was not set. Will not override. Try creating POLARIS_HOME on the agent or ensuring agent has access.")
            }
        }

    
        let exe = tl.tool(polaris_install.polaris_executable);
        exe.line(build_command);
    
        var return_code =  await exe.exec(<tr.IExecOptions>{
            cwd: cwd,
            env: env
        });

        var synopsysFolder = path.join(cwd, ".synopsys");
        var polarisFolder = path.join(synopsysFolder, "polaris");
        var scanJsonFile = path.join(polarisFolder, "cli-scan.json");

        delete process.env["HTTPS_PROXY"];

        return new PolarisRunResult(return_code, scanJsonFile);
    }
}

