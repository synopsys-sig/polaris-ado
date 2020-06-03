
import * as os from 'os';
const winston = require("winston");
import PolarisClient from "./PolarisClient"
import PolarisActions from "./PolarisActions"
import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");


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

        var polaris_url = "https://dev01.dev.polaris.synopsys.com";
        var polaris_target = "C:\\Users\\jordanp\\Downloads\\joda-time-master";
        var polaris_token = "bqqv8a3ad15nb8q5l1vs2riv2i6lt29artb8nggbj9leao07aigg"
        var build_command = "analyze";
        const should_wait_for_issues = true;

        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            polaris_url = polaris_url.slice(0, -1);
        }

        log.debug(`Read task configuration: ${polaris_url} @ ${polaris_token}`);
        
        var polaris_client = new PolarisClient(log, polaris_url, polaris_token, undefined);
        await polaris_client.authenticate();

        log.debug("Authenticated with polaris.");

        var polaris_actions = new PolarisActions(log, tl);

        var target = tl.cwd();
        var scan_cli_json_path = await polaris_actions.execute(polaris_url, polaris_token, target, target, polaris_client, build_command);

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

try {
    run()
} catch(e){
    console.log(e);
}

