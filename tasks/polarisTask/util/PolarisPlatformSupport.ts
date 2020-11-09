import * as os from 'os';

export default class PolarisPlatformSupport {
    platform_specific_cli_zip_url_fragment(client: string) {
        var platform = os.platform();
        if (platform == "win32") {
            return "/api/tools/" + client + "_cli-win64.zip";
        } else if (platform == "darwin") {
            return "/api/tools/" + client + "_cli-macosx.zip";
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