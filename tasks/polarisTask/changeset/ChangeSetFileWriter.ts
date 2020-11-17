import {Logger} from "winston";

var fs = require("fs");
import tl = require("azure-pipelines-task-lib/task");

export default class ChangeSetFileWriter {
    log: Logger;
    constructor(log: Logger) {
        this.log = log;
    }
    async write_change_set_file(file: string, paths: Array<string>) : Promise<number> { //must return something
        return new Promise<number>((resolve, reject) => {
            var content = paths.join("\n");
            fs.writeFile(file, content, (err:any) => {
                if (err) {
                    tl.error("Writing change set file failed: " + err);
                    return reject(err);
                } else {
                    this.log.info("Created change set file: " + file);
                    return resolve(0);
                }
            });
        });
    }
}