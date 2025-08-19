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
        key: string; // 96-byte base64 string
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
        key: string; // ARN of the AWS CMK
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
        keyVaultEndpoint: string; // e.g. "example.vault.azure.net"
        keyName: string;
        keyVersion?: string;
    };
}

// ---------- GCP ----------
export interface IGcpKMSProvider {
    type: "gcp";
    gcp: {
        email: string;      // service account email
        privateKey: string; // PEM encoded
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
        endpoint: string; // e.g. "example.com:5696"
    };
    masterKey?: {
        keyId?: string; // optional key identifier in KMIP
    };
}
