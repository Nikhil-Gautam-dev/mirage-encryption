import { EEncryptionAlgorithm } from "../enums/enums";

export type TSchemaFilePath = string;
export type TCryptSharedFilePath = string;

export interface IKeyVault {
    database: string;
    collection: string;
}

export interface IKeyVaultWithNameSpace extends IKeyVault {
    namespace: string;
}


import { Binary } from "mongodb";

export type TBsonType =
    | "double"
    | "string"
    | "object"
    | "array"
    | "binData"
    | "undefined"
    | "objectId"
    | "bool"
    | "date"
    | "null"
    | "regex"
    | "dbPointer"
    | "javascript"
    | "symbol"
    | "javascriptWithScope"
    | "int"
    | "timestamp"
    | "long"
    | "decimal"
    | "minKey"
    | "maxKey";



export interface IEncryptedField {
    encrypt: {
        keyId: Binary[];
        algorithm: EEncryptionAlgorithm;
        bsonType: TBsonType;
    };
}

export interface ICollectionEncryptionSchema {
    bsonType: "object";
    properties: Record<string, IEncryptedField>;
}

export type IEncryptionSchema = Record<string, ICollectionEncryptionSchema>;


export interface IKeyVaultDocument {
    _id: Binary;
    keyMaterial: Binary;
    keyAltNames?: string[];
    creationDate?: Date;
    updateDate?: Date;
}