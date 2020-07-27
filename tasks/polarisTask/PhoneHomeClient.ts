import { hostname } from "os";

const axios = require('axios');
const getUuid = require('uuid-by-string')

const Constants = {
    // Google Tracking ID
    PRODUCTION_INTEGRATIONS_TRACKING_ID: "UA-116682967-1",
    TEST_INTEGRATIONS_TRACKING_ID: "UA-116682967-2",

    // Api Path(s)
    BASE_URL: "https://www.google-analytics.com",
    COLLECT_ENDPOINT: "/collect",
    BATCH_ENDPOINT: "/batch",
    DEBUG_ENDPOINT: "/debug/collect",

    // Payload Data - Required
    API_VERSION_KEY: "v",
    HIT_TYPE_KEY: "t",
    CLIENT_ID_KEY: "cid",
    USER_ID_KEY: "uid",
    TRACKING_ID_KEY: "tid",
    DOCUMENT_PATH_KEY: "dp",

    // Payload Data - Custom Dimensions
    CUSTOMER_ID: "cd1",
    ARTIFACT_ID: "cd2",
    ARTIFACT_VERSION: "cd3",
    PRODUCT_ID: "cd4",
    PRODUCT_VERSION: "cd5",
    META_DATA: "cd6",
    HOST_NAME: "cd7",
    MODULE_ID: "cd8",

    UNKOWN_FIELD_VALUE: "<unknown>"
}

export default class PhoneHomeClient {
    log: any;
    tracking_id: string;
    product_id: string;
    artifact_id: string;
    constructor(log:any, tracking_id: string, product_id: string, artifact_id: string) {
        this.log = log;
        this.tracking_id = tracking_id;
        this.artifact_id = artifact_id;
        this.product_id = product_id;
    }

    static CreateClient = (log: any) => new PhoneHomeClient(log, Constants.PRODUCTION_INTEGRATIONS_TRACKING_ID, "POLARIS", "polaris-ado");
    static CreateTestClient = (log: any) => new PhoneHomeClient(log, Constants.TEST_INTEGRATIONS_TRACKING_ID, "POLARIS", "polaris-ado");
    static FindTaskVersion = () => { var task = require("./task.json"); return task.version.Major + "." + task.version.Minor + "." + task.version.Patch; }

    async phone_home(polaris_url: string, artifact_version: string, org_name: string | null) {
        if (process.env["BLACKDUCK_SKIP_PHONE_HOME"] || process.env["SYNOPSYS_SKIP_PHONE_HOME"] ) {
            this.log.debug("Will not phone home.")
        }

        const data:any = {};
        data[Constants.API_VERSION_KEY] = "1";
        data[Constants.HIT_TYPE_KEY] = "pageview";
    
        var client_id = Constants.UNKOWN_FIELD_VALUE;
        if (org_name) {
            client_id = org_name;
        } else {
            client_id = polaris_url;
            org_name = Constants.UNKOWN_FIELD_VALUE;
        }
        data[Constants.CLIENT_ID_KEY] = getUuid(client_id).toString(); //Unique device
        data[Constants.CUSTOMER_ID] = org_name; //Our identifier for customers
        data[Constants.HOST_NAME] = polaris_url; //The host name (url) of black duck
        
        data[Constants.TRACKING_ID_KEY] = this.tracking_id;
        data[Constants.DOCUMENT_PATH_KEY] = "phone-home";
    
        data[Constants.ARTIFACT_ID] = this.artifact_id; //name of this plugin (polaris-ado)
        data[Constants.ARTIFACT_VERSION] = artifact_version; //version of this plugin
    
        data[Constants.PRODUCT_ID] = this.product_id; // A subset, one of BLACKDUCK, POLARIS, COVERITY etc.
        data[Constants.PRODUCT_VERSION] = Constants.UNKOWN_FIELD_VALUE; //Polaris does not currently support version.
    
        //data[Constants.META_DATA] = JSON.stringify(meta_data);

        await axios.post(Constants.BASE_URL + Constants.COLLECT_ENDPOINT, data, {timeout: 2000});
    };
}
