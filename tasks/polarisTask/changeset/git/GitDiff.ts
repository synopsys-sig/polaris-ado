import * as tl from "azure-pipelines-task-lib/task";
import {PassThrough} from "stream";
import {Logger} from "winston";

export default class GitDiff {
    log: Logger;
    constructor(log: Logger) {
        this.log = log;
    }
    async get_changed_files_from(commit: string, cwd: string) {
        const outStream = new PassThrough();

        const lines = new Array<string>();
        outStream.on("data", (data: Buffer) => {
            const files = data.toString().split("\n");
            lines.push(...files);
        });
        await tl.exec("git", ["diff", "--name-only", /*from*/ "HEAD", /* to */ commit, "."], { cwd, outStream, errStream: process.stderr});

        const possible_files = lines.map(line => line.trim())
            .filter(line => !line.startsWith("[command]"))
            .filter(line => !line.startsWith("rc:"))
            .filter(line => !line.startsWith("success:"));

        const existing_files = possible_files
            .filter(file => tl.exist(file));

        this.log.info(`Found ${existing_files.length} changed files from git diff from ${possible_files.length} lines.`);

        return existing_files;
    }
}