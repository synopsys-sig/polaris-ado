
import * as os from 'os';
const winston = require("winston");
import PhoneHomeService from "./service/PhoneHomeService"
import tl = require("azure-pipelines-task-lib/task");
import PolarisInputReader from "./input/PolarisInputReader";
import {PolarisTaskInputs} from "./model/PolarisTaskInput";
import PolarisInstaller from "./cli/PolarisInstaller";
import PolarisRunner from "./cli/PolarisRunner";
import PolarisIssueWaiter from "./util/PolarisIssueWaiter";
import PolarisInstall from "./model/PolarisInstall";
import PolarisService from "./service/PolarisService";
import PolarisConnection from "./model/PolarisConnection";
import {Logger} from "winston";
import ChangeSetFileWriter from "./changeset/ChangeSetFileWriter";
import IChangeSetCreator from "./changeset/IChangeSetCreator";
import ChangeSetEnvironment from "./changeset/ChangeSetEnvironment";
import ChangeSetReplacement from "./changeset/ChangeSetReplacement";
import GitChangeSetCreator from "./changeset/git/GitChangeSetCreator";
var task = require("./task.json")

const log : Logger = winston.createLogger({
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
        log.info("Polaris Software Integrity Platform task started.");
        const task_input: PolarisTaskInputs = new PolarisInputReader().readInput();
        const connection: PolarisConnection = task_input.polaris_connection;
        log.debug(`Read task configuration: ${connection.url} @ ${connection.token}`);

        var polaris_install_path: string | undefined;
        polaris_install_path = tl.getVariable('Agent.ToolsDirectory');
        if (!polaris_install_path) {
            log.warn("Agent did not have a tool directory, polaris will be installed to the current working directory.");
            polaris_install_path = tl.cwd();
        }
        log.info(`Polaris Software Integrity Platform will be installed to the following path: ` + polaris_install_path);


        log.info("Connecting to Polaris Software Integrity Platform server.")
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

        //If there are no changes, we can potentially bail early, so we do that first.
        var actual_build_command = task_input.build_command;
        if (task_input.should_populate_changeset) {
            log.debug("Populating change set for Polaris Software Integrity Platform.");
            const changed_files = await new GitChangeSetCreator(log).generate_change_set(tl.cwd());
            if (changed_files.length == 0 && task_input.should_empty_changeset_fail) {
                tl.setResult(tl.TaskResult.Failed, ` Task failed: No changed files were found.`);
                return;
            } else if (changed_files.length == 0) {
                log.info("Task finished: No changed files were found.")
                return;
            }
            const change_set_environment = new ChangeSetEnvironment(log, process.env);
            const change_file = change_set_environment.get_or_create_file_path(tl.cwd());
            change_set_environment.set_enable_incremental();

            await new ChangeSetFileWriter(log).write_change_set_file(change_file, changed_files);
            actual_build_command = new ChangeSetReplacement().replace_build_command(actual_build_command, change_file);
        }

        log.debug("Installing Polaris Software Integrity Platform.");
        var polaris_installer = PolarisInstaller.default_installer(log, polaris_service);
        var polaris_install: PolarisInstall = await polaris_installer.install_or_locate_polaris(connection.url, polaris_install_path);
        log.debug("Found Polaris Software Integrity Platform: " + polaris_install.polaris_executable);

        log.debug("Running Polaris Software Integrity Platform.");
        var polaris_runner = new PolarisRunner(log);
        var polaris_run_result = await polaris_runner.execute_cli(connection, polaris_install, tl.cwd(), actual_build_command);

        log.debug("Executed Polaris Software Integrity Platform: " + polaris_run_result.return_code);

        if (task_input.should_wait_for_issues) {
            log.info("Checking for issues.")
            var polaris_waiter = new PolarisIssueWaiter(log);
            var issue_count = await polaris_waiter.wait_for_issues(polaris_run_result.scan_cli_json_path, polaris_service);
            if (issue_count != null && issue_count > 0) {
                tl.setResult(tl.TaskResult.Failed, ` Polaris Software Integrity Platform found ${issue_count} total issues.`);
            }
        } else {
            log.info("Will not check for issues.")
        }

        log.info("Task completed.")
    } catch (e) {
        tl.setResult(tl.TaskResult.Failed, `An unexpected error occured:${e}`);
    }
}

run()
