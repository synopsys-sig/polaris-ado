export class PolarisProxyInfo {
    proxy_url: string;
    proxy_username: string | undefined;
    proxy_password: string| undefined;
    constructor(proxy_url: string, proxy_username: string| undefined, proxy_password: string| undefined) {
        this.proxy_url = proxy_url;
        this.proxy_username = proxy_username;
        this.proxy_password = proxy_password;
    }
}