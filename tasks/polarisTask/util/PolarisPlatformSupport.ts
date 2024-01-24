import * as os from 'os';

export default class PolarisPlatformSupport {
    platform_specific_cli_zip_url_fragment(client: string) {
        var platform = os.platform();
        if (platform == "win32") {
            return "/api/tools/" + client + "_cli-win64.zip";
        } else if (platform == "darwin") {
            // The mac runner architecture in the ADO returns same for both arm and non arm machines.
            // So, we fetch the CPU information and try to detect if it is a non-arm runner
            const cpuInfo = os.cpus();
            if ((cpuInfo.length) > 0) {
                const isIntel = cpuInfo[0].model.includes("Intel");
                if (isIntel) {
                    return "/api/tools/" + client + "_cli-macosx.zip";
                }
                return "/api/tools/" + client + "_cli-macos_arm.zip";
            } else {
                const arch = os.arch()
                if (arch == "x86_64") {
                    return "/api/tools/" + client + "_cli-macosx.zip";
                }
                return "/api/tools/" + client + "_cli-macos_arm.zip";
            }
        } else {
            return "/api/tools/" + client + "_cli-linux64.zip";
        }
    }

    platform_specific_executable_name(client: string) {
        var platform = os.platform();
        if (platform == "win32") {
            return client + ".exe";
        } else {
            return client;
        }
    }
}