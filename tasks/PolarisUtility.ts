
import * as os from 'os';
const winston = require("winston");
const axios = require('axios');
const moment = require("moment");
const CancelToken = axios.CancelToken;
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');

import tl = require("azure-pipelines-task-lib/task");
import tr = require("azure-pipelines-task-lib/toolrunner");

//Polaris_CLI_Installation

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

function determineRelativeDownloadUrl(client: string) {
    var platform = os.platform();
    if (platform == "win32") {
        return "/api/tools/" + client + "_cli-win64.zip";
    } else if (platform == "darwin") {
        return "/api/tools/" + client + "_cli-macosx.zip";
    } else {
        return "/api/tools/" + client + "_cli-linux64.zip";
    }
}

function determineExecutable(client: string) {
    var platform = os.platform();
    if (platform == "win32") {
        return client + ".exe";
    } else {
        return client;
    }
}

function determineDownloadUrl(server: string, client: string) {
    return server + determineRelativeDownloadUrl(client);
}

async function retreiveModifiedHeader(url: string) {
    var token = CancelToken.source();

    return new Promise((resolve, reject) => {
        axios({
            url: url,
            method: 'GET',
            responseType: 'stream', // important, let's us cancel the after we get the headers.
            cancelToken: token.token
        }).then(function (response: any) {
            var lastModifiedText = response.headers['last-modified'];
            log.debug("Last Modified Header: " + lastModifiedText);
            var lastModifiedDate = moment(lastModifiedText);
            log.debug("Last Modified Date: " + lastModifiedDate.format());
            token.cancel();
            resolve(lastModifiedDate);
        }).catch(function (error: any) {
            reject(error);
        });
    });
}

async function downloadCli(url: string, file: string) {
    const writer = fs.createWriteStream(file)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject)
    })
}

async function extractCli(sourceZip: string, targetPath: string) {
    var zip = new zipper(sourceZip);
    await zip.extractAllTo(targetPath, /*overwrite*/ true);
}

var lastDownloaded = moment("2020-05-06T19:01:30-04:00");

async function run() {
    if (process.env.POLARIS_HOME) {

    }

    var url = determineDownloadUrl("https://dev01.dev.polaris.synopsys.com", "polaris");
    log.debug("Using polaris url: " + url);
    var date: any = await retreiveModifiedHeader(url);
    log.debug("Downloaded request header: " + date.format());

    const target = path.resolve(__dirname, "polaris");
    if (lastDownloaded.isBefore(date)) {
        log.info("Downloading Polaris CLI.")
        const zip = path.resolve(__dirname, "polaris.zip");
        await downloadCli(url, zip);
        log.debug("Downloaded polaris zip: " + zip);
        await extractCli(zip, target);
        log.debug("Extracted polaris: " + target);
    } else {
        log.debug("Latest polaris, will not download.");
    }

    log.debug("Finding polaris executable.");
    var polarisInternalFolders = fs.readdirSync(target);
    var polarisFolder = path.join(target, polarisInternalFolders[0]);
    var bin = path.join(polarisFolder, "bin");
    var exe = path.join(bin, determineExecutable("polaris"));
    log.debug("Looking for executable: " + exe);
    if (fs.existsSync(exe)) {
        await execute(exe);
    } else {
        log.error("Could not find polaris even after download.");
    }
}

run();


async function execute(exe: string) {
    let go: tr.ToolRunner = tl.tool(exe);

    //go.arg(this.command);
    //go.line(this.argument);

    return await go.exec(<tr.IExecOptions>{
        //cwd: this.workingDir
    });
}