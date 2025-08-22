/**
 * Configuration for KMS providers - matches the MongoDB ClientEncryption KMSProviders type
 */
export interface IKmsProviderConfig {
    [key: string]: any;  // Index signature to match MongoDB's KMSProviders type
    local?: {
        key: string;
    };
    aws?: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    };
    azure?: {
        clientId: string;
        clientSecret: string;
        tenantId: string;
    };
    gcp?: {
        email: string;
        privateKey: string;
    };
    kmip?: {
        endpoint: string;
    };
}

/**
 * Master key configuration for different KMS providers
 */
export interface IMasterKeyConfig {
    region?: string;
    key?: string;
    endpoint?: string;
    keyVaultEndpoint?: string;
    keyName?: string;
    keyVersion?: string;
    projectId?: string;
    location?: string;
    keyRing?: string;
    keyId?: string;
}
