export class PolarisInstall {
    polaris_executable: string;
    polaris_home: string;
    constructor(polaris_executable: string, polaris_home: string) {
        this.polaris_executable = polaris_executable;
        this.polaris_home = polaris_home;
    }
}