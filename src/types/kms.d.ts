export type IKMSProvider = | ILocalKMSProvider | IAzureKMSProvider

export interface ILocalKMSProvider {
    type: "local";
    local: {
        key: string;
    };
}

export interface IAzureKMSProvider {
    type: "azure";
    azure: {
        clientId: string;
        clientSecret: string;
        tenantId: string;
    };
}