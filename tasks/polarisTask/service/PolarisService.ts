
import * as os from 'os';
var ProxyAgent = require("proxy-agent");
const HttpsProxyAgent = require("https-proxy-agent");
const url = require('url');
const Axios = require('axios');
const moment = require("moment");
const CancelToken = Axios.CancelToken;
const fs = require('fs');
const json_path = require('jsonpath');
const debug = require('debug');
import PolarisConnection from "../model/PolarisConnection";

export default class PolarisService {
    log: any;
    polaris_url: string;
    access_token: string;
    bearer_token: string | null;
    headers: any | null;
    axios: any;
    constructor(log:any, connection: PolarisConnection) {
        if (connection.url.endsWith("/") || connection.url.endsWith("\\")) {
            this.polaris_url = connection.url.slice(0, -1);
        } else {
            this.polaris_url = connection.url;
        }
        
        this.access_token = connection.token;
        this.bearer_token = null;
        this.headers = null;
        this.log = log;
        

        if (connection.proxy != undefined) {
            log.info(`Using Proxy URL: ${connection.proxy.proxy_url}`)
            var proxyOpts = url.parse(connection.proxy.proxy_url);

            var proxyConfig :any = { 
                host: proxyOpts.hostname, 
                port: proxyOpts.port 
            };

            if (connection.proxy.proxy_username && connection.proxy.proxy_password) {
                log.info("Using configured proxy credentials.")
                proxyConfig.auth = connection.proxy.proxy_username + ":" + connection.proxy.proxy_password;
            }

            const httpsAgent = new HttpsProxyAgent(proxyConfig)
            this.axios = Axios.create({httpsAgent});
        } else {
            this.axios = Axios.create();
        }
    }

    async authenticate() {
        this.log.info("Authenticating with polaris.")
        debug.enable('https-proxy-agent');
        this.bearer_token = await this.fetch_bearer_token();
        debug.disable();
        this.headers = {
            Authorization: `Bearer ${this.bearer_token}`
        }
    }

    async get_job(job_status_url: string) {
        return await this.axios.get(job_status_url, {
            headers: this.headers
        });
    }

    fetch_bearer_token():Promise<string> {
        // this is a workaround for https://github.com/TooTallNate/node-https-proxy-agent/issues/102
        //basically NodeJS thinks all event loops are closed, this ensures the event look hasn't closed. 
        // TODO: Need to switch to a new http library that doesn't suffer from this bug.
        //Basically we need to reject the promise ourselves 
        const resultPromise = new Promise<string>((resolve, reject) => {
            const timeout = 10000
            setTimeout(() => { reject(new Error(`Failed to authenticate with polaris. This may be a problem with your polaris url, proxy setup or network.`))}, timeout);

            var authenticateUrl = this.polaris_url + "/api/auth/authenticate";
    
            try {
                this.axios.post(authenticateUrl, "accesstoken=" + this.access_token, {timeout: 10000, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then((authResponse:any) => {
                    if (authResponse.data.jwt) {
                        this.log.info("Succesfully authenticated, saving bearer token.")
                        resolve(authResponse.data.jwt);
                    } else {
                        this.log.error(`Failed to authenticate with polaris, no bearer token received.`)
                        reject(new Error(`Failed to authenticate with polaris. Status: ${authResponse.status} Reason: ${authResponse.statusText}`))
                    }
                }).catch((e:any) => {
                    this.log.error(`Unable to authenticate with polaris at url: ${authenticateUrl}`);
                    this.log.error(`This may be a problem with your polaris url, proxy setup or network.`);
                    reject(e);
                })
            } catch (e) {
                this.log.error(`Unable to authenticate with polaris at url: ${authenticateUrl}`);
                this.log.error(`This may be a problem with your polaris url, proxy setup or network.`);
                reject(e);
            }
        })
        return resultPromise;
    }

    async fetch_cli_modified_date(url: string): Promise<any> { //return type should be a moment
        var token = CancelToken.source();
        var self = this;
        self.log.debug("Fetching cli modified date from: " + url);
        return new Promise((resolve, reject) => {
            this.axios({
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
        return await this.axios.get(url, {
            headers: this.headers
        });
    }

    async fetch_organization_name(): Promise<string | null> {
        var target = this.polaris_url + "/api/auth/contexts";
        var result = await this.axios({
            url: target,
            method: 'GET',
            responseType: 'json',
            headers: this.headers,
        });
        var organization_names = json_path.query(result.data, "$.data[*].attributes.organizationname");
        if (organization_names.length > 0) {
            return organization_names[0];
        } else {
            return null;
        }
    }
    
    async download_cli(url: string, file: string) {
        this.log.debug("Downloading cli from: " + url);
        this.log.debug("Downloading cli to: " + file);

        const writer = fs.createWriteStream(file);
    
        const response = await this.axios({
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