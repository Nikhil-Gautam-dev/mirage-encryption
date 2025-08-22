import { MongoClient, MongoClientOptions } from "mongodb";
import { IKMSProvider } from "./types/kms";
import { IEncryptionSchema, IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "./types/schema";
import { fileExists } from "./utils/file.utils";
import { EncryptionSchemaService } from "./encryptionSchemaService";
import { DekManager } from "./dekManager";
import path from "path";
import { validateCSFLESchema } from "./utils/schema.utils";
import { ConfigurationError, ValidationError, EncryptionError } from "./errors/errors";
import { IEncryptionConfig } from "./types/encryption.config";


export class ServerEncryptionService {

    private readonly mongoUri: string;
    private readonly kmsProvider: IKMSProvider;
    private readonly keyVault: IKeyVault;
    private readonly cryptSharedFilePath: TCryptSharedFilePath;
    private readonly mongoClient: MongoClient;
    private readonly mongoClientOptions: MongoClientOptions;

    private encryptedMongoClient: MongoClient | undefined;
    private config: MongoClientOptions | undefined;
    private schema: IEncryptionSchema | undefined;

    /**
     * Creates a new ServerEncryptionService
     * 
     * @param mongoUri - MongoDB connection URI
     * @param kmsProvider - KMS provider configuration
     * @param keyVault - Key vault configuration
     * @param cryptSharedFilePath - Path to the MongoDB crypto shared library
     * @param options - Additional MongoDB client options
     * @throws {ConfigurationError} If any configuration parameter is invalid
     */
    constructor(
        mongoUri: string,
        kmsProvider: IKMSProvider,
        keyVault: IKeyVault,
        cryptSharedFilePath: TCryptSharedFilePath,
        options?: MongoClientOptions
    ) {
        if (!mongoUri || mongoUri.trim() === "") {
            throw new ConfigurationError("Invalid MongoDB URI");
        }

        this.validateCryptSharedFilePath(cryptSharedFilePath);

        this.mongoUri = mongoUri;
        this.kmsProvider = kmsProvider;
        this.keyVault = keyVault;
        this.cryptSharedFilePath = cryptSharedFilePath;
        this.mongoClient = new MongoClient(mongoUri);
        this.mongoClientOptions = options || {};
    }


    /**
     * Initialize the encrypted MongoDB client
     * 
     * @throws {ConfigurationError} If the encryption configuration is invalid
     */
    private initialize(): void {
        try {
            this.config = {
                ...this.mongoClientOptions,
                ...this.buildEncryptionConfig()
            };

            this.encryptedMongoClient = new MongoClient(
                this.mongoUri,
                this.config
            );
        } catch (error: any) {
            throw new ConfigurationError(`Failed to initialize encryption: ${error.message || String(error)}`);
        }
    }

    /**
     * Initialize the service using a schema file
     * 
     * @param schemaFilePath - Path to the schema file
     * @param schemaLoader - Optional custom schema loader function
     * @throws {ValidationError} If the schema file path is invalid
     * @throws {ConfigurationError} If schema loading or initialization fails
     */
    public async initializeWithFile(schemaFilePath: TSchemaFilePath, schemaLoader?: (file: string) => IEncryptionSchema): Promise<void> {
        try {
            this.validateSchemaFilePath(schemaFilePath);

            if (schemaLoader === undefined) {
                this.schema = await this.loadSchemaFromFile(schemaFilePath);
            } else {
                this.schema = schemaLoader(schemaFilePath);
            }

            this.initialize();
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new ConfigurationError(`Failed to initialize with schema file: ${error.message || String(error)}`);
        }
    }


    /**
     * Initialize the service using a schema object
     * 
     * @param schema - Encryption schema
     * @throws {ValidationError} If the schema is invalid
     * @throws {ConfigurationError} If initialization fails
     */
    public initializeWithSchema(schema: IEncryptionSchema): void {
        if (!schema || Object.keys(schema).length === 0) {
            throw new ValidationError("Encryption schema is required and cannot be empty");
        }

        try {
            this.schema = schema;
            this.initialize();
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new ConfigurationError(`Failed to initialize with schema: ${error.message || String(error)}`);
        }
    }


    /**
     * Get the initialized MongoDB client
     * 
     * @returns MongoDB client with encryption enabled
     * @throws {ConfigurationError} If the client is not initialized
     */
    public getMongoClient(): MongoClient {
        if (!this.encryptedMongoClient) {
            throw new ConfigurationError("MongoDB client is not initialized. Call initializeWithSchema or initializeWithFile first.");
        }
        return this.encryptedMongoClient;
    }

    /**
     * Get the encryption schema
     * 
     * @returns Encryption schema
     * @throws {ConfigurationError} If the schema is not initialized
     */
    public getSchema(): IEncryptionSchema {
        if (!this.schema) {
            throw new ConfigurationError("Encryption schema is not initialized. Call initializeWithSchema or initializeWithFile first.");
        }
        return this.schema;
    }


    /**
     * Validate the crypt shared library path
     * 
     * @param filePath - Path to crypt shared library
     * @throws {ValidationError} If the file path is invalid or the file doesn't exist
     */
    private validateCryptSharedFilePath(filePath: TCryptSharedFilePath): void {
        if (!filePath || filePath.trim() === "") {
            throw new ValidationError("Crypt shared file path is required");
        }

        if (!fileExists(filePath)) {
            throw new ValidationError(`Crypt shared file does not exist at path: ${filePath}`);
        }
    }

    /**
     * Validate the schema file path
     * 
     * @param filePath - Path to schema file
     * @throws {ValidationError} If the file path is invalid or the file doesn't exist
     */
    private validateSchemaFilePath(filePath: TSchemaFilePath): void {
        if (!filePath || filePath.trim() === "") {
            throw new ValidationError("Schema file path is required");
        }

        if (!fileExists(filePath)) {
            throw new ValidationError(`Schema file does not exist at path: ${filePath}`);
        }
    }

    /**
     * Build the MongoDB encryption configuration
     * 
     * @returns Encryption configuration for MongoDB client
     * @throws {ConfigurationError} If configuration is invalid
     * @throws {ValidationError} If schema validation fails
     */
    private buildEncryptionConfig(): IEncryptionConfig {
        // Validate required configurations
        if (!this.keyVault || !this.keyVault.database || !this.keyVault.collection) {
            throw new ConfigurationError("Invalid key vault configuration. Database and collection are required.");
        }

        if (!this.kmsProvider) {
            throw new ConfigurationError("KMS provider is required");
        }

        if (!this.schema) {
            throw new ConfigurationError("Encryption schema is required");
        }

        // Validate the schema structure
        try {
            validateCSFLESchema(this.schema);
        } catch (error: any) {
            throw new ValidationError(`Schema validation failed: ${error.message}`);
        }

        // Create the proper KMS providers structure based on the provider type
        const kmsProviders: Record<string, any> = {};
        try {
            switch (this.kmsProvider.type) {
                case "local":
                    kmsProviders.local = { key: this.kmsProvider.local.key };
                    break;
                case "aws":
                    kmsProviders.aws = {
                        accessKeyId: this.kmsProvider.aws.accessKeyId,
                        secretAccessKey: this.kmsProvider.aws.secretAccessKey,
                        sessionToken: this.kmsProvider.aws.sessionToken
                    };
                    break;
                case "azure":
                    kmsProviders.azure = {
                        clientId: this.kmsProvider.azure.clientId,
                        clientSecret: this.kmsProvider.azure.clientSecret,
                        tenantId: this.kmsProvider.azure.tenantId
                    };
                    break;
                case "gcp": {
                    kmsProviders.gcp = {
                        email: this.kmsProvider.gcp.email,
                        privateKey: this.kmsProvider.gcp.privateKey
                    };
                    break;
                }
                default:
                    throw new ConfigurationError(`Unsupported KMS provider: ${String(this.kmsProvider.type)}`);
            }
        } catch (error: any) {
            if (error instanceof ConfigurationError) {
                throw error;
            }
            throw new ConfigurationError(`Failed to configure KMS provider: ${error.message}`);
        }

        return {
            autoEncryption: {
                keyVaultNamespace: `${this.keyVault.database}.${this.keyVault.collection}`,
                kmsProviders: kmsProviders,
                schemaMap: this.schema,
                extraOptions: {
                    cryptSharedLibPath: path.resolve(this.cryptSharedFilePath),
                    cryptSharedLibRequired: true,
                }
            }
        };
    }

    /**
     * Load a schema from a file and generate the CSFLE schema
     * 
     * @param schemaFilePath - Path to the schema file
     * @returns Generated encryption schema
     * @throws {EncryptionError} If schema generation fails
     */
    private async loadSchemaFromFile(schemaFilePath: string): Promise<IEncryptionSchema> {
        try {
            const dekManager = new DekManager(
                this.mongoClient,
                `${this.keyVault.database}.${this.keyVault.collection}`,
                this.keyVault,
                this.kmsProvider
            );
            const encryptionSchemaService = new EncryptionSchemaService(dekManager);
            return await encryptionSchemaService.generateCSFLESchema(schemaFilePath);
        } catch (error: any) {
            throw new EncryptionError(`Failed to load schema from file ${schemaFilePath}: ${error.message}`);
        }
    }

}