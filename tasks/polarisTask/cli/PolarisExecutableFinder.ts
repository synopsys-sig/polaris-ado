const fs = require('fs');
const path = require('path');
import PolarisPlatformSupport from "../util/PolarisPlatformSupport";

export default class PolarisExecutableFinder {
    log: any;
    platformSupport: PolarisPlatformSupport;
    constructor(log:any, platformSupport: PolarisPlatformSupport) {
        this.log = log;
        this.platformSupport = platformSupport;
    }

    async find_executable(polaris_install: string): Promise<string> {
        var polarisInternalFolders = fs.readdirSync(polaris_install);
        var polarisFolder = path.join(polaris_install, polarisInternalFolders[0]);
        var bin = path.join(polarisFolder, "bin");
        var exes = fs.readdirSync(bin);
        for (var i in exes) {
            var file = exes[i];
            await this.ensure_executable(path.join(bin, file));
        }
        var polaris_exe = this.platformSupport.platform_specific_executable_name("polaris");
        return path.join(bin, polaris_exe);
    }

    private async ensure_executable(exe: string): Promise<string> {
        if (fs.existsSync(exe)) {
            this.log.debug(`Ensuring ${exe} is executable.`)
            fs.chmodSync(exe, 0o775);
            return exe;
        } else {
            throw new Error(`Could not make ${exe} executable.`);
        }
    }
}