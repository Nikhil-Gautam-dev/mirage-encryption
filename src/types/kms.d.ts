// Base KMS Provider type
export type IKMSProvider =
    | ILocalKMSProvider
    | IAwsKMSProvider
    | IAzureKMSProvider
    | IGcpKMSProvider
    | IKmipKMSProvider;

// ---------- LOCAL ----------
export interface ILocalKMSProvider {
    type: "local";
    local: {
        key: string;
    };
    masterKey?: never; // local does not require masterKey
}

// ---------- AWS ----------
export interface IAwsKMSProvider {
    type: "aws";
    aws: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    };
    masterKey: {
        region: string;
        key: string;
        endpoint?: string;
    };
}

// ---------- AZURE ----------
export interface IAzureKMSProvider {
    type: "azure";
    azure: {
        clientId: string;
        clientSecret: string;
        tenantId: string;
    };
    masterKey: {
        keyVaultEndpoint: string;
        keyName: string;
        keyVersion?: string;
    };
}

// ---------- GCP ----------
export interface IGcpKMSProvider {
    type: "gcp";
    gcp: {
        email: string;
        privateKey: string;
    };
    masterKey: {
        projectId: string;
        location: string;
        keyRing: string;
        keyName: string;
        keyVersion?: string;
        endpoint?: string;
    };
}

// ---------- KMIP ----------
export interface IKmipKMSProvider {
    type: "kmip";
    kmip: {
        endpoint: string;
    };
    masterKey?: {
        keyId?: string;
    };
}
