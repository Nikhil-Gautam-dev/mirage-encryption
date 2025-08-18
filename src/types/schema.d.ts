
export type TSchemaFilePath = string;
export type TCryptSharedFilePath = string;

export interface IEncryptionSchema {
    [collectionName: string]: {
        bsonType: string;
        properties: {
            [fieldName: string]: {
                encrypt: {
                    keyId: string[];
                    algorithm: EEncryptionAlgorithm;
                    bsonType: string;
                };
            }
        }
    }
}

export enum EEncryptionAlgorithm {
    AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic = "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
}


export interface IKeyVault {
    database: string;
    collection: string;
}

export interface IKeyVaultWithNameSpace extends IKeyVault {
    namespace: string;
}
