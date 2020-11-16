import * as tl from "azure-pipelines-task-lib/task";
import {PassThrough} from "stream";
import {Logger} from "winston";
import IChangeSetCreator from "../IChangeSetCreator";
import AzureVariables from "./AzureVariables";
import AzureApiClient from "./AzureApiClient";
import GitDiff from "./GitDiff";

export default class GitChangeSetCreator implements IChangeSetCreator {
    log: Logger;
    constructor(log: Logger) {
        this.log = log;
    }

    async generate_change_set(cwd: string): Promise<Array<string>> {
        const variables = new AzureVariables();
        const client = new AzureApiClient(variables);
        await client.connect();

        const lastBuildSource = await client.get_latest_build_commit();
        if (lastBuildSource == undefined) return [];

        const diff = new GitDiff(this.log);
        return await diff.get_changed_files_from(lastBuildSource, cwd);
    }
}