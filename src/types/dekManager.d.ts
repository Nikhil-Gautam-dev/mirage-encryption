import { MongoClient } from "mongodb";
import { IKMSProvider } from "./kms";
import { IKeyVault } from "./schema";

/**
 * Manager for Data Encryption Keys (DEKs) used in MongoDB Client-Side Field Level Encryption
 */
export declare class DekManager {
    /**
     * MongoDB client instance for database operations
     */
    readonly mongoClient: MongoClient;

    /**
     * Creates a new DekManager instance
     * 
     * @param mongoClient - MongoDB client instance for database operations
     * @param keyVaultNamespace - String in the format "database.collection" where encryption keys are stored
     * @param keyVault - Configuration for the key vault
     * @param kmsProvider - Key Management Service provider configuration
     */
    constructor(mongoClient: MongoClient, keyVaultNamespace: string, keyVault: IKeyVault, kmsProvider: IKMSProvider);

    /**
     * Gets or creates a Data Encryption Key (DEK) for a field
     * 
     * @param fieldKeyAltName - Alternative name for the key, typically in format "collectionName.fieldName"
     * @returns Promise resolving to the DEK ID as a base64 string
     */
    getDEK(fieldKeyAltName: string): Promise<string>;

    /**
     * Returns the kmsProviders configuration expected by ClientEncryption
     * 
     * @param provider - Key Management Service provider configuration
     * @returns Configuration object for the specified KMS provider
     * @private
     */
    private getKmsProviderConfig(provider: IKMSProvider): Record<string, any>;

    /**
     * Returns the masterKey for createDataKey based on the KMS provider
     * 
     * @param provider - Key Management Service provider configuration
     * @returns Master key configuration or undefined for local KMS
     * @private
     */
    private getMasterKey(provider: IKMSProvider): Record<string, any> | undefined;
}
