var defaultPath = ".synopsys/polaris/changeSetFile.txt";

export default interface IChangeSetCreator {
    generate_change_set(cwd: string): Promise<Array<string>>;
}