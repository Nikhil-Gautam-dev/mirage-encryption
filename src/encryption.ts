import { MongoClient, MongoClientOptions } from "mongodb";
import { IKMSProvider } from "./types/kms";
import { IEncryptionSchema, IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "./types/schema";
import { fileExists } from "./utils/file.utils";
import { EncryptionSchemaService } from "./encryptionSchemaService";
import { DekManager } from "./dekManager";


export class ServerEncryptionService {

    private readonly mongoUri: string;
    private readonly kmsProvider: IKMSProvider;
    private readonly keyVault: IKeyVault;
    private readonly cryptSharedFilePath: TCryptSharedFilePath;
    private readonly mongoClient: MongoClient;

    private encryptedMongoClient: MongoClient | undefined;
    private config: MongoClientOptions | undefined;
    private schema: IEncryptionSchema | undefined;

    constructor(mongoUri: string, kmsProvider: IKMSProvider, keyVault: IKeyVault, cryptSharedFilePath: TCryptSharedFilePath) {

        if (!mongoUri || mongoUri === "") {
            throw new Error("Invalid MongoDB URI");
        }

        switch (kmsProvider.type) {
            case "local":
                break;
            case "azure":
                break;
            default:
                throw new Error("Unsupported KMS provider");
        }

        this.validateCryptSharedFilePath(cryptSharedFilePath);
        this.mongoUri = mongoUri;
        this.kmsProvider = kmsProvider;
        this.keyVault = keyVault;
        this.cryptSharedFilePath = cryptSharedFilePath;
        this.mongoClient = new MongoClient(mongoUri);
    }


    private initialize(options?: MongoClientOptions): void {
        this.config = {
            ...options,
            ...this.buildEncryptionConfig()
        };

        this.encryptedMongoClient = new MongoClient(
            this.mongoUri,
            this.config
        )
    }

    public initializeWithFile(schemaFilePath: TSchemaFilePath, schemaLoader?: (file: string) => IEncryptionSchema) {

        this.validateSchemaFilePath(schemaFilePath);

        if (schemaLoader === undefined) {
            this.schema = this.loadSchemaFromFile(schemaFilePath);
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


    public getMongoClient(): MongoClient | undefined {
        if (!this.encryptedMongoClient) {
            throw new Error("MongoDB client is not initialized");
        }
        return this.encryptedMongoClient;
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

        if (fileExists(filePath)) {
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

        return {
            autoEncryption: {
                keyVaultNamespace: `${this.keyVault.database}.${this.keyVault.collection}`,
                kmsProviders: this.kmsProvider,
                schemaMap: this.schema,
                extraOptions: {
                    cryptSharedFilePath: this.cryptSharedFilePath,
                    cryptSharedLibRequired: true,
                }
            }
        };
    }

    private loadSchemaFromFile(schemaFilePath: string): any {

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