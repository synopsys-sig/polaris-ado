
import * as os from 'os';
const winston = require("winston");
const axios = require('axios');
const moment = require("moment");
const CancelToken = axios.CancelToken;
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');
const json_path = require('jsonpath');

import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");

export default class PolarisClient {
    log: any;
    polaris_url: string;
    access_token: string;
    bearer_token: string | null;
    headers: any | null;
    constructor(log:any, polaris_url: string, access_token: string) {
        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            this.polaris_url = polaris_url.slice(0, -1);
        } else {
            this.polaris_url = polaris_url;
        }
        
        this.access_token = access_token;
        this.bearer_token = null;
        this.headers = null;
        this.log = log;
    }

    async authenticate() {
        this.log.info("Authenticating with polaris.")
        this.bearer_token = await this.fetch_bearer_token();
        this.headers = {
            Authorization: `Bearer ${this.bearer_token}`
        }
    }

    async get_job(job_status_url: string) {
        return await axios.get(job_status_url, {
            headers: this.headers
        });
    }

    async fetch_bearer_token() {
        var authenticateBaseUrl = this.polaris_url + "/api/auth/authenticate";
        var authenticateUrl = authenticateBaseUrl + "?accesstoken=" + "bqqv8a3ad15nb8q5l1vs2riv2i6lt29artb8nggbj9leao07aigg"
        var authResponse = await axios.post(authenticateUrl);
        if (authResponse.data.jwt) {
            this.log.info("Succesfully authenticated, saving bearer token.")
            return authResponse.data.jwt;
        } else {
            this.log.error(`Failed to authenticate with polaris, no bearer token received.`)
            throw new Error(`Failed to authenticate with polaris. Status: ${authResponse.status} Reason: ${authResponse.statusText}`)
        }
    }

    async fetch_cli_modified_date(url: string): Promise<any> { //return type should be a moment
        var token = CancelToken.source();
        var self = this;
        self.log.debug("Fetching cli modified date from: " + url);
        return new Promise((resolve, reject) => {
            axios({
                url: url,
                method: 'GET',
                responseType: 'stream', // important, let's us cancel the after we get the headers.
                cancelToken: token.token
            }).then(function (response: any) {
                var lastModifiedText = response.headers['last-modified'];
                self.log.debug("Last Modified Header: " + lastModifiedText);
                var lastModifiedDate = moment(lastModifiedText);
                self.log.debug("Last Modified Date: " + lastModifiedDate.format());
                token.cancel();
                resolve(lastModifiedDate);
            }).catch(function (error: any) {
                reject(error);
            });
        });
    }

    async fetch_issue_data(url: string): Promise<any> {
        return await axios.get(url, {
            headers: this.headers
        });
    }
    
    async download_cli(url: string, file: string) {
        this.log.debug("Downloading cli from: " + url);
        this.log.debug("Downloading cli to: " + file);

        const writer = fs.createWriteStream(file);
    
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
    
        response.data.pipe(writer);
    
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject)
        });
    }
}