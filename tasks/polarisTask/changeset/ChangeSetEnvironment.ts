import {Logger} from "winston";


export default class ChangeSetEnvironment {
    log: Logger;
    env: any;
    constructor(log:Logger, env:any) {
        this.log = log;
        this.env = env;
    }

    is_file_path_present(): boolean {
        if ("CHANGE_SET_FILE_PATH" in this.env) {
            return true;
        } else {
            return false;
        }
    }

    set_default_file_path(cwd: string) {
        this.env["CHANGE_SET_FILE_PATH"] = cwd + "\\.synopsys\\polaris\\changeSetFile.txt";
    }

    get_file_path(): string {
        return this.env["CHANGE_SET_FILE_PATH"]
    }

    get_or_create_file_path(cwd: string): string {
        if (this.is_file_path_present()) {
            return this.get_file_path();
        } else {
            this.set_default_file_path(cwd);
            return this.get_file_path();
        }
    }
}