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

export default class PolarisActions {
    log: any;
    tl: any;
    constructor(log:any, tl: any) {
        this.tl = tl;
        this.log = log;
    }

    async execute(polaris_url: string, polaris_token:string, polaris_target:string, polaris_client: PolarisClient, build_command: string): Promise<String> {
        this.log.info("Starting polaris task.")
        var polaris_cli_name = "polaris"; // used to be "swip"
        var polaris_utility = new PolarisUtility(this.log);
    
        var polaris_cli_location = path.resolve(__dirname, "polaris");
        var version_file = path.join(polaris_cli_location, "version.txt");
        var relative_cli_url = polaris_utility.determine_cli_relative_location(polaris_cli_name);
        var cli_url = polaris_url + relative_cli_url;
    
        this.log.info(`Using polaris cli location: ` + polaris_cli_location)
        this.log.info(`Using polaris cli url: ` + cli_url)
        this.log.debug("Checking for version file: " + version_file)
    
        var download_cli = false;
        if (fs.existsSync(version_file)) {
            this.log.debug("Version file exists.")
            var current_version_date = moment(fs.readFileSync(version_file));
            var available_version_date = await polaris_client.fetch_cli_modified_date(cli_url);
            this.log.debug("Current version: " + current_version_date.format())
            this.log.debug("Available version: " + available_version_date.format())
            if (current_version_date.isBefore(available_version_date)) {
                this.log.info("Downloading Polaris CLI because a newer version is available.")
                fs.writeFileSync(version_file, available_version_date.format());
                download_cli = true;
            } else {
                this.log.info("Existing Polaris CLI will be used.")
            }
        } else {
            this.log.info("Downloading Polaris CLI because a version file did not exist.")
            download_cli = true;
        }
    
        if (download_cli) {
            this.log.info("Starting download.")
            const polaris_zip = path.resolve(__dirname, "polaris.zip");
            await polaris_client.download_cli(cli_url, polaris_zip);
            this.log.info("Starting extraction.")
            await polaris_utility.extract_cli(polaris_zip,  polaris_cli_location);
            this.log.info("Download and extraction finished.")
        }
        
        this.log.info("Looking for Polaris executable.")
        var polaris_exe = await polaris_utility.find_executable(polaris_cli_location, polaris_cli_name);
        this.log.info("Found executable: " + polaris_exe)
    
        var polaris_result = await polaris_utility.execute_cli(polaris_exe, polaris_target, polaris_url, polaris_token, build_command);
    
        this.log.info("Polaris exit code: " + polaris_result.returnCode)
        this.log.info("Reading scan result: " + polaris_result.scanCliJsonPath)
        
        return polaris_result.scanCliJsonPath;
    }
    
    async wait_for_issues(scan_cli_json_path: String, polaris_client: PolarisClient) {
        var scan_json_text = fs.readFileSync(scan_cli_json_path);
        var scan_json = JSON.parse(scan_json_text);
    
        var issue_counts = json_path.query(scan_json, "$.issueSummary.total");
        if (issue_counts.length == 0) {
            this.log.info("No issues found in scan json, will go to Polaris server.")
    
            var job_status_urls = json_path.query(scan_json, "$.tools[*].jobStatusUrl");
            if (job_status_urls.length > 0) {
                this.log.info("Waiting for jobs: " + job_status_urls.length)
                var polaris_job_service = new PolarisJobService(this.log, polaris_client);
                await polaris_job_service.waitForJobsToEnd(job_status_urls);    
            } else {
                this.log.info("No jobs were found to wait for.")
            }
        
            var issue_api_url = json_path.query(scan_json, "$.scanInfo.issueApiUrl");
            if (issue_api_url.length > 0) {
                this.log.info("Getting issues from Polaris server.")
                var issue_response =  await polaris_client.fetch_issue_data(issue_api_url[0]);
                issue_counts = json_path.query(issue_response.data, "$.data..attributes.value");
            }
        } else {
            this.log.info("Issue count was found in polaris scan json, will use found counts.")
        }
    
        if (issue_counts.length != 0) {
            var total_count = issue_counts.reduce((a:any, b:any) => a + b, 0)
            this.log.info("Total issues: " + total_count)
    
            if (total_count > 0) {
                this.tl.setResult(this.tl.TaskResult.Failed, `Polaris found ${total_count} total issues.`);
            }
        } else {
            this.log.info("Did not find any issue counts.")
        }
    }
}

