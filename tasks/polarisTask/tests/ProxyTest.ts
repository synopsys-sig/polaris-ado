import * as os from 'os';
const winston = require("winston");
import PhoneHomeService from "../service/PhoneHomeService"
import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");
import PolarisProxyInfo from "../model/PolarisProxyInfo";
import PolarisService from "../service/PolarisService";
import PolarisConnection from "../model/PolarisConnection";
var task = require("../task.json")

//do something when app is closing
process.on('exit', () => console.log('exit'));

//catches ctrl+c event
process.on('SIGINT', () => console.log('sigint'));

//catches uncaught exceptions
process.on('uncaughtException', (err:any) => console.log('uncaught'));

process.on('unhandledRejection', (err:any) => console.log('unahdnled'));

const log = winston.createLogger({
    level: "debug",
    transports: [
        new (winston.transports.Console)({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
        })
    ],
});

async function run() {
    try {
        log.info("Polaris task started.");

        var polaris_url: string = process.env["polaris.url"];
        const polaris_token: string = process.env["polaris.access.token"];

        var proxy_url: string = process.env["proxy.url"];
        const proxy_username: string | undefined = undefined
        const proxy_password: string | undefined = undefined
        var polaris_proxy_info = new PolarisProxyInfo(proxy_url, proxy_username, proxy_password);

        const build_command = "analyze";
        const should_wait_for_issues = false;

        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            polaris_url = polaris_url.slice(0, -1);
        }

        log.debug(`Read task configuration: ${polaris_url} @ ${polaris_token}`);

        let polaris_install_path: string | undefined;
        polaris_install_path = tl.getVariable('Agent.ToolsDirectory');
        if (!polaris_install_path) {
            log.warn("Agent did not have a tool directory, polaris will be installed to the current working directory.");
            polaris_install_path = tl.cwd();
        }

        log.info(`Installing polaris to directory: ` + polaris_install_path);

        var polaris_client = new PolarisService(log, new PolarisConnection(polaris_url, polaris_token, polaris_proxy_info));
        await polaris_client.authenticate();

        log.debug("Authenticated with polaris.");

        process.env["HTTPS_PROXY"] = proxy_url;

        log.info("Task completed.")
    } catch (e) {
        tl.setResult(tl.TaskResult.Failed, `An unexpected error occured:${e}`);
    }
}

//run()

var phoneHomeClient = PhoneHomeService.CreateClient(log);
phoneHomeClient.phone_home("https://qa.dev.polaris.synopsys.com/", "1.0.1", "fake_org")
log.info("phoned home");