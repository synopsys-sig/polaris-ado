
const axios = require('axios');

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

    static CreateClient = (log: any) => new PhoneHomeClient(log, Constants.PRODUCTION_INTEGRATIONS_TRACKING_ID, "synopsys-polaris", "polaris-ado");
    static CreateTestClient = (log: any) => new PhoneHomeClient(log, Constants.TEST_INTEGRATIONS_TRACKING_ID, "synopsys-polaris", "polaris-ado");
    static FindTaskVersion = () => { var task = require("./task.json"); return task.version.Major + "." + task.version.Minor + "." + task.version.Patch; }

    async phone_home(polaris_url: string, artifact_version: string, meta_data: any) {
        const data:any = {};
        data[Constants.API_VERSION_KEY] = "1";
        data[Constants.HIT_TYPE_KEY] = "pageview";
    
        data[Constants.CLIENT_ID_KEY] = polaris_url; //Unique device
        data[Constants.CUSTOMER_ID] = polaris_url; //Our identifier for customers
        data[Constants.HOST_NAME] = polaris_url; //The host name (url) of black duck
        
        data[Constants.TRACKING_ID_KEY] = Constants.PRODUCTION_INTEGRATIONS_TRACKING_ID;
        data[Constants.DOCUMENT_PATH_KEY] = "phone-home";
    
        data[Constants.ARTIFACT_ID] = this.artifact_id; //synopsys-polaris-plugin
        data[Constants.ARTIFACT_VERSION] = artifact_version;
    
        data[Constants.PRODUCT_ID] = this.artifact_id;
        data[Constants.PRODUCT_VERSION] = Constants.UNKOWN_FIELD_VALUE;
    
        data[Constants.META_DATA] = JSON.stringify(meta_data);
        await axios.post('http://www.google-analytics.com/collect', data);
    };
}
