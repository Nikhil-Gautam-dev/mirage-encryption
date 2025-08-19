import { EEncryptionAlgorithm } from "../enums/enums";

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


export interface IKeyVault {
    database: string;
    collection: string;
}

export interface IKeyVaultWithNameSpace extends IKeyVault {
    namespace: string;
}
