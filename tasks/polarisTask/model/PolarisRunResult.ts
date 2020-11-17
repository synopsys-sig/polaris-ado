export default class PolarisRunResult {
    return_code: Number;
    scan_cli_json_path: string;
    constructor(return_code:Number, scan_cli_json_path:string) {
        this.return_code = return_code;
        this.scan_cli_json_path = scan_cli_json_path;
    }
}
