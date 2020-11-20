const json_path = require('jsonpath');

import PolarisService from "./PolarisService"

export default class PolarisJobService {
    log: any;
    polaris_client: PolarisService
    constructor(log:any, polaris_client: PolarisService) {
        this.log = log;
        this.polaris_client = polaris_client;
    }

    async waitForJobsToEnd(status_job_urls: string[]) {
        var self = this;
        await asyncForEach(status_job_urls, async function(job:string) {
            await self.waitForJobToEnd(job);
            await self.checkJobSuccess(job);
        });
    }

    async waitForJobToEnd(status_job_url: string) {
        var running = true;
        while (running) {
            var jobEnded = await this.hasJobEnded(status_job_url);
            
            if (jobEnded) {
                running = false;
            } else {
                this.log.info("Waiting 2 seconds for job to complete.");
                await sleep(2000);    
            }
        }
    }

    async hasJobEnded(status_job_url: string): Promise<boolean> {
        var job_response = await this.polaris_client.get_job(status_job_url);
        var status = json_path.query(job_response.data, "$.data.attributes.status.state");
        if (containsAny(status, ["QUEUED", "RUNNING", "DISPATCHED"])) {
            return false;
        }
        return true;
    }
    
    async checkJobSuccess(status_job_url: string) {
        var job_response = await this.polaris_client.get_job(status_job_url);
        var status = json_path.query(job_response.data, "$.data.attributes.status.state");
        if (containsAny(status, ["FAILED"])) {
            var reason = json_path.query(job_response.data, "$.data.attributes.failureInfo.userFiendlyFailureReason");
            if (reason.length > 0) {
                this.log.error("Check the job status in Polaris Software Integrity Platform for more details.")
                throw new Error(JSON.stringify(reason));
            }
        }
        return true;
    }
}

async function asyncForEach(array: any[], func: any) {
  for (let index = 0; index < array.length; index++) {
    await func(array[index], index, array);
  }
}

function containsAny(array: any[], elements: any[]) { 
    return array.some(r=> elements.indexOf(r) >= 0);
}

async function sleep(ms:any) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}