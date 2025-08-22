import { MongoClientOptions } from "mongodb";
import { IKmsProviderConfig } from "./config";

/**
 * MongoDB auto-encryption configuration options
 */
export interface IAutoEncryptionOptions {
    keyVaultNamespace: string;
    kmsProviders: IKmsProviderConfig;
    schemaMap: Record<string, any>;
    extraOptions: {
        cryptSharedLibPath: string;
        cryptSharedLibRequired: boolean;
    };
}

/**
 * MongoDB client options with auto-encryption
 */
export interface IEncryptionConfig extends MongoClientOptions {
    autoEncryption: IAutoEncryptionOptions;
}
