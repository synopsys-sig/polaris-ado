import * as tl from "azure-pipelines-task-lib/task";
import {PassThrough} from "stream";
import {Logger} from "winston";
import path from "path";

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
            .filter(line => line.length > 0)
            .filter(line => this.doesNotStartWithAny(line, "[command]", "rc:", "success:"))

        const existing_files = possible_files
            .filter(file => tl.exist(file))
            .map(file => path.resolve(cwd, file));

        this.log.info(`Found ${existing_files.length} changed files from git diff from ${possible_files.length} lines.`);

        return existing_files;
    }

    private doesNotStartWithAny(item: string, ...targets:string[]): boolean {
        return targets.filter(target => item.startsWith(target)).length == 0;
    }
}