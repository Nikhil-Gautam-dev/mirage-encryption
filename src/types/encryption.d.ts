import { MongoClient, MongoClientOptions } from "mongodb";
import { IKMSProvider } from "./kms";
import { IEncryptionSchema, IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "./schema";

/**
 * Service for managing MongoDB client-side field level encryption
 */
export declare class ServerEncryptionService {
    /**
     * Creates a new ServerEncryptionService instance
     * 
     * @param mongoUri - MongoDB connection URI
     * @param kmsProvider - Key Management Service provider configuration
     * @param keyVault - Key vault configuration for storing encryption keys
     * @param cryptSharedFilePath - Path to the crypt_shared library file
     * @param options - Optional MongoDB client options
     */
    constructor(mongoUri: string, kmsProvider: IKMSProvider, keyVault: IKeyVault, cryptSharedFilePath: TCryptSharedFilePath, options?: MongoClientOptions);    /**
     * Initialize encryption with schema loaded from a file
     * 
     * @param schemaFilePath - Path to the schema definition file
     * @param schemaLoader - Optional custom loader function for the schema
     */
    public initializeWithFile(schemaFilePath: TSchemaFilePath, schemaLoader?: (file: string) => IEncryptionSchema): Promise<void>;

    /**
     * Initialize encryption with an in-memory schema object
     * 
     * @param schema - Encryption schema configuration
     */
    public initializeWithSchema(schema: IEncryptionSchema): void;

    /**
     * Get the configured MongoDB client with encryption enabled
     * 
     * @returns The MongoDB client instance
     * @throws Error if client is not initialized
     */
    public getMongoClient(): MongoClient;

    /**
     * Get the encryption schema
     * 
     * @returns The encryption schema configuration
     * @throws Error if schema is not initialized
     */
    public getSchema(): IEncryptionSchema;
}