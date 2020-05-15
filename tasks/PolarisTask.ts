
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
import PolarisUtility from "./PolarisUtility"
import PolarisJobService from './PolarisJobService';
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


var lastDownloaded = moment("2020-05-08T17:19:00-04:00");

async function perform() {
    log.info("Starting polaris task.")
    var polaris_url = "https://dev01.dev.polaris.synopsys.com";
    var polaris_target = "C:\\Users\\jordanp\\Downloads\\joda-time-master";
    var polaris_token = "bqqv8a3ad15nb8q5l1vs2riv2i6lt29artb8nggbj9leao07aigg"
    var polaris_cli_name = "polaris"; // used to be "swip"

    var polaris_client = new PolarisClient(log, polaris_url, polaris_token);
    await polaris_client.authenticate();

    var polaris_utility = new PolarisUtility(log);

    var polaris_cli_location = path.resolve(__dirname, "polaris");
    var version_file = path.join(polaris_cli_location, "version.txt");
    var relative_cli_url = polaris_utility.determine_cli_relative_location(polaris_cli_name);
    var cli_url = polaris_url + relative_cli_url;

    log.info(`Using polaris cli location: ` + polaris_cli_location)
    log.info(`Using polaris cli url: ` + cli_url)
    log.debug("Checking for version file: " + version_file)

    var download_cli = false;
    if (fs.existsSync(version_file)) {
        log.debug("Version file exists.")
        var current_version_date = moment(fs.readFileSync(version_file));
        var available_version_date = await polaris_client.fetch_cli_modified_date(cli_url);
        log.debug("Current version: " + current_version_date.format())
        log.debug("Available version: " + available_version_date.format())
        if (current_version_date.isBefore(available_version_date)) {
            log.info("Downloading Polaris CLI because a newer version is available.")
            fs.writeFileSync(version_file, available_version_date.format());
            download_cli = true;
        } else {
            log.info("Existing Polaris CLI will be used.")
        }
    } else {
        log.info("Downloading Polaris CLI because a version file did not exist.")
        download_cli = true;
    }

    if (download_cli) {
        log.info("Starting download.")
        const polaris_zip = path.resolve(__dirname, "polaris.zip");
        await polaris_client.download_cli(cli_url, polaris_zip);
        log.info("Starting extraction.")
        await polaris_utility.extract_cli(polaris_zip,  polaris_cli_location);
        log.info("Download and extraction finished.")
    }
    
    log.info("Looking for Polaris executable.")
    var polaris_exe = await polaris_utility.find_executable(polaris_cli_location, polaris_cli_name);
    log.info("Found executable: " + polaris_exe)

    var polaris_result = await polaris_utility.execute_cli(polaris_exe, polaris_target, polaris_url, polaris_token);

    log.info("Polaris exit code: " + polaris_result.returnCode)
    log.info("Reading scan result: " + polaris_result.scanCliJsonPath)
    var scan_json_text = fs.readFileSync(polaris_result.scanCliJsonPath);
    var scan_json = JSON.parse(scan_json_text);

    var issue_counts = json_path.query(scan_json, "$.issueSummary.total");
    if (issue_counts.length == 0) {
        log.info("No issues found in scan json, will go to Polaris server.")

        var job_status_urls = json_path.query(scan_json, "$.tools[*].jobStatusUrl");
        if (job_status_urls.length > 0) {
            log.info("Waiting for jobs: " + job_status_urls.length)
            var polaris_job_service = new PolarisJobService(log, polaris_client);
            await polaris_job_service.waitForJobsToEnd(job_status_urls);    
        } else {
            log.info("No jobs were found to wait for.")
        }
    
        var issue_api_url = json_path.query(scan_json, "$.scanInfo.issueApiUrl");
        if (issue_api_url.length > 0) {
            log.info("Getting issues from Polaris server.")
            var issue_response =  await polaris_client.fetch_issue_data(issue_api_url[0]);
            issue_counts = json_path.query(issue_response.data, "$.data..attributes.value");
        }
    } else {
        log.info("Issue count was found in polaris scan json, will use found counts.")
    }

    if (issue_counts.length != 0) {
        var total_count = issue_counts.reduce((a:any, b:any) => a + b, 0)
        log.info("Total issues: " + total_count)

        if (total_count > 0) {
            tl.setResult(tl.TaskResult.Failed, `Polaris found ${total_count} total issues.`);
        }
    } else {
        log.info("Will not check for issues.")
    }
    
    log.info("Finished polaris task.");
}

perform()