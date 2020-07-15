
import * as os from 'os';
import * as tunnel from 'tunnel';

const url = require('url');
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

export class PolarisProxyInfo {
    proxy_url: string;
    proxy_username: string | undefined;
    proxy_password: string| undefined;
    constructor(proxy_url: string, proxy_username: string| undefined, proxy_password: string| undefined) {
        this.proxy_url = proxy_url
        this.proxy_username = proxy_username
        this.proxy_password = proxy_password
    }
}

export default class PolarisClient {
    log: any;
    polaris_url: string;
    access_token: string;
    bearer_token: string | null;
    headers: any | null;
    proxy_config: object;
    constructor(log:any, polaris_url: string, access_token: string, proxy_info: PolarisProxyInfo | undefined) {
        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            this.polaris_url = polaris_url.slice(0, -1);
        } else {
            this.polaris_url = polaris_url;
        }
        
        this.access_token = access_token;
        this.bearer_token = null;
        this.headers = null;
        this.log = log;
        this.proxy_config = {};

        if (proxy_info != undefined) {
            log.info(`Using Proxy URL: ${proxy_info.proxy_url}`)
            const proxy_url = url.parse(proxy_info.proxy_url);
            log.info(`Proxy Host: ${proxy_url.hostname}`)
            log.info(`Proxy Port: ${proxy_url.port}`)
            var tunnelConfig: tunnel.HttpsOverHttpOptions = <tunnel.HttpsOverHttpOptions>{
                proxy: {
                    host: proxy_url.hostname,
                    port: proxy_url.port
                }
            };
            if (proxy_info.proxy_username && proxy_info.proxy_password && tunnelConfig.proxy) {
                log.info("Using configured proxy credentials.")
                tunnelConfig.proxy.proxyAuth = proxy_info.proxy_username + ":" + proxy_info.proxy_password;
            }

            const agent = tunnel.httpsOverHttp(tunnelConfig)
            this.proxy_config =  { "agent": agent }
        }
    }

    async authenticate() {
        this.log.info("Authenticating with polaris.")
        this.bearer_token = await this.fetch_bearer_token();
        
        this.headers = {
            Authorization: `Bearer ${this.bearer_token}`
        }
    }

    async get_job(job_status_url: string) {
        return await axios.get(job_status_url, {...this.proxy_config,
            headers: this.headers
        });
    }

    async fetch_bearer_token() {
        var authenticateBaseUrl = this.polaris_url + "/api/auth/authenticate";
        var authenticateUrl = authenticateBaseUrl + "?accesstoken=" + this.access_token
        try {
            var authResponse = await axios.post(authenticateUrl, null, this.proxy_config);
            if (authResponse.data.jwt) {
                this.log.info("Succesfully authenticated, saving bearer token.")
                return authResponse.data.jwt;
            } else {
                this.log.error(`Failed to authenticate with polaris, no bearer token received.`)
                throw new Error(`Failed to authenticate with polaris. Status: ${authResponse.status} Reason: ${authResponse.statusText}`)
            }
        } catch (e) {
            this.log.error(`Unable to authenticate with polaris at url: ${authenticateBaseUrl}`);
            this.log.error(`This may be a problem with your polaris url, proxy setup or network.`);
            throw e;
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
                cancelToken: token.token,
                ...this.proxy_config
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
            headers: this.headers,
            ...this.proxy_config
        });
    }

    async fetch_organization_name(): Promise<string | null> {
        var target = this.polaris_url + "/api/auth/contexts";
        var result = await axios({
            url: target,
            method: 'GET',
            responseType: 'json',
            headers: this.headers,
            ...this.proxy_config
        });
        var organizationnames = json_path.query(result.data, "$.data[*].attributes.organizationname");
        if (organizationnames.length > 0) {
            return organizationnames[0];
        } else {
            return null;
        }
    }
    
    async download_cli(url: string, file: string) {
        this.log.debug("Downloading cli from: " + url);
        this.log.debug("Downloading cli to: " + file);

        const writer = fs.createWriteStream(file);
    
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            ...this.proxy_config
        });
    
        response.data.pipe(writer);
    
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject)
        });
    }
}