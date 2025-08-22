import { MongoClient, MongoClientOptions } from "mongodb";
import { IKMSProvider } from "./types/kms";
import { IEncryptionSchema, IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "./types/schema";
import { fileExists } from "./utils/file.utils";
import { EncryptionSchemaService } from "./encryptionSchemaService";
import { DekManager } from "./dekManager";
import path from "path";
import { validateCSFLESchema } from "./utils/schema.utils";


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

    constructor(
        mongoUri: string,
        kmsProvider: IKMSProvider,
        keyVault: IKeyVault,
        cryptSharedFilePath: TCryptSharedFilePath,
        options?: MongoClientOptions
    ) {

        if (!mongoUri || mongoUri === "") {
            throw new Error("Invalid MongoDB URI");
        }

        this.validateCryptSharedFilePath(cryptSharedFilePath);

        this.mongoUri = mongoUri;
        this.kmsProvider = kmsProvider;
        this.keyVault = keyVault;
        this.cryptSharedFilePath = cryptSharedFilePath;
        this.mongoClient = new MongoClient(mongoUri);
        this.mongoClientOptions = options || {};
    }


    private initialize(): void {
        this.config = {
            ...this.mongoClientOptions,
            ...this.buildEncryptionConfig()
        };

        this.encryptedMongoClient = new MongoClient(
            this.mongoUri,
            this.config
        )
    }

    public async initializeWithFile(schemaFilePath: TSchemaFilePath, schemaLoader?: (file: string) => IEncryptionSchema) {

        this.validateSchemaFilePath(schemaFilePath);

        if (schemaLoader === undefined) {
            this.schema = await this.loadSchemaFromFile(schemaFilePath);
        }

        else {
            this.schema = schemaLoader(schemaFilePath);
        }

        this.initialize();
    }


    public initializeWithSchema(schema: IEncryptionSchema) {
        if (!schema || Object.keys(schema).length === 0) {
            throw new Error("Encryption schema is required");
        }

        this.schema = schema;
        this.initialize();
    }


    public getMongoClient(): MongoClient {
        if (!this.encryptedMongoClient) {
            throw new Error("MongoDB client is not initialized");
        }
        return this.encryptedMongoClient;
    }

    public getSchema(): IEncryptionSchema {
        if (!this.schema) {
            throw new Error("Encryption schema is not initialized");
        }
        return this.schema;
    }


    private validateCryptSharedFilePath(filePath: TCryptSharedFilePath): void {
        if (!filePath || filePath === "") {
            throw new Error("Crypt shared file path is required");
        }

        if (!fileExists(filePath)) {
            throw new Error(`Crypt shared file does not exist at path: ${filePath}`);
        }

    }

    private validateSchemaFilePath(filePath: TSchemaFilePath): void {
        if (!filePath || filePath === "") {
            throw new Error("Schema file path is required");
        }

        if (!fileExists(filePath)) {
            throw new Error(`Schema file does not exist at path: ${filePath}`);
        }

    }

    private buildEncryptionConfig(): any {

        if (!this.keyVault || !this.keyVault.database || !this.keyVault.collection) {
            throw new Error("Invalid key vault configuration");
        }

        if (!this.kmsProvider) {
            throw new Error("KMS provider is required");
        }

        if (!this.schema) {
            throw new Error("Encryption schema is required");
        }

        validateCSFLESchema(this.schema)

        // Create the proper KMS providers structure based on the provider type
        const kmsProviders: Record<string, any> = {};
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
                throw new Error("Unsupported KMS provider");
        }

        return {
            autoEncryption: {
                keyVaultNamespace: `${this.keyVault.database}.${this.keyVault.collection}`,
                kmsProviders: kmsProviders,
                schemaMap: this.schema,
                extraOptions: {
                    cryptSharedFilePath: path.resolve(this.cryptSharedFilePath),
                    cryptSharedLibRequired: false,
                }
            }
        };
    }

    private async loadSchemaFromFile(schemaFilePath: string): Promise<IEncryptionSchema> {

        const dekManager = new DekManager(
            this.mongoClient,
            `${this.keyVault.database}.${this.keyVault.collection}`,
            this.keyVault,
            this.kmsProvider
        );
        const encryptionSchemaService = new EncryptionSchemaService(dekManager);
        return encryptionSchemaService.generateCSFLESchema(schemaFilePath);
    }

}