
import * as os from 'os';
const winston = require("winston");
import { default as PolarisClient, PolarisProxyInfo } from "./PolarisClient"
import PolarisActions from "./PolarisActions"
import PhoneHomeClient from "./PhoneHomeClient"
import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");
var task = require("./task.json")

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

        var polaris_service_id = "polarisService";
        var polaris_service = tl.getInput(polaris_service_id, /* required: */ true)!
        var polaris_url: string = tl.getEndpointUrl(polaris_service, /* optional: */ false);
        const polaris_token: string = tl.getEndpointAuthorizationParameter(polaris_service, 'apiToken', /* optional: */ false)!

        var polaris_proxy_info: PolarisProxyInfo | undefined = undefined;
        var polaris_proxy_id = "polarisProxyService";
        var polaris_proxy_service = tl.getInput(polaris_proxy_id, /* required: */ false)
        if (polaris_proxy_service) {
            var proxy_url: string = tl.getEndpointUrl(polaris_proxy_service, /* optional: */ true);
            const proxy_username: string | undefined = tl.getEndpointAuthorizationParameter(polaris_proxy_service, 'username', /* optional: */ true)
            const proxy_password: string | undefined = tl.getEndpointAuthorizationParameter(polaris_proxy_service, 'password', /* optional: */ true)   
            polaris_proxy_info = new PolarisProxyInfo(proxy_url, proxy_username, proxy_password);
        }


        const build_command = tl.getInput('polarisCommand', /* required: */ true)!;
        const should_wait_for_issues = tl.getBoolInput('waitForIssues', /* required: */ true)!;

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

        var polaris_client = new PolarisClient(log, polaris_url, polaris_token, polaris_proxy_info);
        await polaris_client.authenticate();

        log.debug("Authenticated with polaris.");
        
        try {
            const client = PhoneHomeClient.CreateClient(log);
            await client.phone_home(polaris_url, PhoneHomeClient.FindTaskVersion(), "");
            log.debug("Phoned home.");
        } catch (e){
            log.debug("Unable to phone home.");
        }

        var polaris_actions = new PolarisActions(log, tl);

        var target = tl.cwd();
        var scan_cli_json_path = await polaris_actions.execute(polaris_url, polaris_token, target, polaris_install_path, polaris_client, build_command);

        log.debug("Executed polaris.");

        if (should_wait_for_issues) {
            log.info("Checking for issues.")
            await polaris_actions.wait_for_issues(scan_cli_json_path, polaris_client);
        } else {
            log.info("Will not check for issues.")
        }

        log.info("Task completed.")
    } catch (e) {
        tl.setResult(tl.TaskResult.Failed, `An unexpected error occured:${e}`);
    }
}

run()
