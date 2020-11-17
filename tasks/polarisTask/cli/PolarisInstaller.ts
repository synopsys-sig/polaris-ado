import PolarisExecutableFinder from "./PolarisExecutableFinder";
import PolarisPlatformSupport from "../util/PolarisPlatformSupport";
import PolarisService from "../service/PolarisService";
import PolarisInstall from "../model/PolarisInstall";

const moment = require("moment");
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const zipper = require('adm-zip');

export default class PolarisInstaller {
    log: any;
    executable_finder: PolarisExecutableFinder;
    platform_support: PolarisPlatformSupport;
    polaris_service: PolarisService;

    static default_installer(log:any, polaris_service: PolarisService) {
        const platform_support = new PolarisPlatformSupport();
        const executable_finder = new PolarisExecutableFinder(log, platform_support);
        return new PolarisInstaller(log, executable_finder, platform_support, polaris_service);
    }

    constructor(log:any, executable_finder: PolarisExecutableFinder, platform_support: PolarisPlatformSupport, polaris_service: PolarisService) {
        this.log = log;
        this.executable_finder = executable_finder;
        this.platform_support = platform_support;
        this.polaris_service = polaris_service;
    }

    async install_or_locate_polaris(polaris_url: string, polaris_install_path: string) : Promise<PolarisInstall> {
        var polaris_cli_name = "polaris"; // used to be "swip"

        var polaris_cli_location = path.resolve(polaris_install_path, "polaris");
        var version_file = path.join(polaris_cli_location, "version.txt");
        var relative_cli_url = this.platform_support.platform_specific_cli_zip_url_fragment(polaris_cli_name);
        var cli_url = polaris_url + relative_cli_url;
        var synopsys_path = path.resolve(polaris_install_path, ".synopsys");
        var polaris_home = path.resolve(synopsys_path, "polaris");

        this.log.info(`Using polaris cli location: ` + polaris_cli_location)
        this.log.info(`Using polaris cli url: ` + cli_url)
        this.log.debug("Checking for version file: " + version_file)

        var download_cli = false;
        var available_version_date = await this.polaris_service.fetch_cli_modified_date(cli_url);
        if (fs.existsSync(version_file)) {
            this.log.debug("Version file exists.")
            var current_version_date = moment(fs.readFileSync(version_file, { encoding: 'utf8' }));
            this.log.debug("Current version: " + current_version_date.format())
            this.log.debug("Available version: " + available_version_date.format())
            if (current_version_date.isBefore(available_version_date)) {
                this.log.info("Downloading Polaris CLI because a newer version is available.")
                download_cli = true;
            } else {
                this.log.info("Existing Polaris CLI will be used.")
            }
        } else {
            this.log.info("Downloading Polaris CLI because a version file did not exist.")
            download_cli = true;
        }

        if (download_cli) {
            if (fs.existsSync(polaris_cli_location)) {
                this.log.info(`Cleaning up the Polaris installation directory: ${polaris_cli_location}`);
                this.log.info("Please do not place anything in this folder, it is under extension control.");
                fse.removeSync(polaris_cli_location);
            }

            this.log.info("Starting download.")
            const polaris_zip = path.join(polaris_install_path, "polaris.zip");
            await this.polaris_service.download_cli(cli_url, polaris_zip);

            this.log.info("Starting extraction.")
            var zip = new zipper(polaris_zip);
            await zip.extractAllTo(polaris_cli_location, /*overwrite*/ true);
            this.log.info("Download and extraction finished.")

            fse.ensureFileSync(version_file);
            fs.writeFileSync(version_file, available_version_date.format(), 'utf8');
            this.log.info(`Wrote version file: ${version_file}`)
        }

        this.log.info("Looking for Polaris executable.")
        var polaris_exe = await this.executable_finder.find_executable(polaris_cli_location);
        this.log.info("Found executable: " + polaris_exe)
        return new PolarisInstall(polaris_exe, polaris_home);
    }
}