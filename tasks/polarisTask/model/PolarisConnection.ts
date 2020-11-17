import PolarisProxyInfo from "./PolarisProxyInfo";

export default class PolarisConnection {
    constructor(url: string, token: string, proxy: PolarisProxyInfo | undefined) {
        this.url = url;
        this.token = token;
        this.proxy = proxy;
    }
    url: string;
    token: string;
    proxy: PolarisProxyInfo | undefined;
}

