export default class ChangeSetReplacement {
    replace_build_command(build_command: string, path: string): string {
        return build_command.split("$CHANGE_SET_FILE_PATH").join(path);
    }
}