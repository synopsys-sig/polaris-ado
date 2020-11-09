
import * as os from 'os';
const winston = require("winston");
import PhoneHomeService from "./service/PhoneHomeService"
import tl = require("azure-pipelines-task-lib/task");
import PolarisInputReader from "./util/PolarisInputReader";
import {PolarisTaskInputs} from "./model/PolarisTaskInput";
import PolarisInstaller from "./cli/PolarisInstaller";
import PolarisRunner from "./cli/PolarisRunner";
import PolarisIssueWaiter from "./util/PolarisIssueWaiter";
import PolarisExecutableFinder from "./cli/PolarisExecutableFinder";
import PolarisPlatformSupport from "./util/PolarisPlatformSupport";
import {PolarisInstall} from "./model/PolarisInstall";
import PolarisService from "./service/PolarisService";
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
        var task_input: PolarisTaskInputs = new PolarisInputReader().readInput();
        var connection = task_input.polaris_connection;
        log.debug(`Read task configuration: ${connection.url} @ ${connection.token}`);

        let polaris_install_path: string | undefined;
        polaris_install_path = tl.getVariable('Agent.ToolsDirectory');
        if (!polaris_install_path) {
            log.warn("Agent did not have a tool directory, polaris will be installed to the current working directory.");
            polaris_install_path = tl.cwd();
        }
        log.info(`Polaris will be installed to the following path: ` + polaris_install_path);


        log.info("Connecting to Polaris server.")
        const polaris_service = new PolarisService(log, connection);
        await polaris_service.authenticate();
        log.debug("Authenticated with polaris.");
        
        try {
            log.debug("Fetching organization name and task version.");
            const org_name = await polaris_service.fetch_organization_name();
            const task_version = PhoneHomeService.FindTaskVersion();

            log.debug("Starting phone home.");
            const phone_home_service = PhoneHomeService.CreateClient(log);
            await phone_home_service.phone_home(connection.url, task_version, org_name);
            log.debug("Phoned home.");
        } catch (e){
            log.debug("Unable to phone home.");
        }

        log.debug("Installing polaris.");
        var platform_support = new PolarisPlatformSupport();
        var executable_finder = new PolarisExecutableFinder(log, platform_support);
        var polaris_installer = new PolarisInstaller(log, executable_finder, platform_support, polaris_service);
        var polaris_install: PolarisInstall = await polaris_installer.install_or_locate_polaris(connection.url, polaris_install_path);
        log.debug("Found polaris: " + polaris_install.polaris_executable);


        log.debug("Running polaris.");
        var polaris_runner = new PolarisRunner(log);
        var polaris_run_result = await polaris_runner.execute_cli(connection, polaris_install, tl.cwd(), task_input.build_command);

        log.debug("Executed polaris: " + polaris_run_result.return_code);

        if (task_input.should_wait_for_issues) {
            log.info("Checking for issues.")
            var polaris_waiter = new PolarisIssueWaiter(log);
            await polaris_waiter.wait_for_issues(polaris_run_result.scan_cli_json_path, polaris_service);
        } else {
            log.info("Will not check for issues.")
        }

        log.info("Task completed.")
    } catch (e) {
        tl.setResult(tl.TaskResult.Failed, `An unexpected error occured:${e}`);
    }
}

run()
