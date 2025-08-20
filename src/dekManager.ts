import { Binary, ClientEncryption, MongoClient, } from "mongodb";
import {
    IKMSProvider
} from "./types/kms";
import { IKeyVault, IKeyVaultDocument } from "./types/schema";

export class DekManager {
    public readonly mongoClient: MongoClient;
    private readonly keyVaultNamespace: string;
    private readonly keyVault: IKeyVault;
    private readonly kmsProvider: IKMSProvider;

    constructor(mongoClient: MongoClient, keyVaultNamespace: string, keyVault: IKeyVault, kmsProvider: IKMSProvider) {
        this.mongoClient = mongoClient;
        this.keyVaultNamespace = keyVaultNamespace;
        this.keyVault = keyVault;
        this.kmsProvider = kmsProvider;
    }

    public async getDEK(fieldKeyAltName: string): Promise<Binary> {
        await this.mongoClient.connect();

        try {
            const keyVault = this.mongoClient.db(this.keyVault.database).collection(this.keyVault.collection);

            // Check if a DEK with this altName already exists
            const existingKey = await keyVault.findOne<IKeyVaultDocument>({ keyAltNames: fieldKeyAltName });
            if (existingKey) {
                return existingKey._id as Binary;
            }

            const encryption = new ClientEncryption(this.mongoClient, {
                keyVaultNamespace: this.keyVaultNamespace,
                kmsProviders: this.getKmsProviderConfig(this.kmsProvider),
            });

            const masterKey = this.getMasterKey(this.kmsProvider);
            const dekId = await encryption.createDataKey(this.kmsProvider.type, {
                masterKey,
                keyAltNames: [fieldKeyAltName],
            });

            return dekId;
        } catch (error) {
            console.error("Error getting DEK:", error);
            throw error;
        }
        finally {
            await this.mongoClient.close();
        }
    }

    /**
     * Returns the kmsProviders configuration expected by ClientEncryption.
     */
    private getKmsProviderConfig(provider: IKMSProvider): Record<string, any> {
        switch (provider.type) {
            case "local":
                return { local: { key: provider.local.key } };

            case "aws":
                return {
                    aws: {
                        accessKeyId: provider.aws.accessKeyId,
                        secretAccessKey: provider.aws.secretAccessKey,
                        sessionToken: provider.aws.sessionToken,
                    },
                };

            case "azure":
                return {
                    azure: {
                        clientId: provider.azure.clientId,
                        clientSecret: provider.azure.clientSecret,
                        tenantId: provider.azure.tenantId,
                    },
                };

            case "gcp":
                return {
                    gcp: {
                        email: provider.gcp.email,
                        privateKey: provider.gcp.privateKey,
                    },
                };

            case "kmip":
                return {
                    kmip: {
                        endpoint: provider.kmip.endpoint,
                    },
                };

            default:
                throw new Error(`Unsupported KMS provider: ${(provider as any).type}`);
        }
    }

    /**
     * Returns the masterKey for createDataKey based on the KMS provider.
     */
    private getMasterKey(provider: IKMSProvider): Record<string, any> | undefined {
        switch (provider.type) {
            case "local":
                return undefined; // local does not need a masterKey

            case "aws":
                return {
                    region: provider.masterKey.region,
                    key: provider.masterKey.key,
                    endpoint: provider.masterKey.endpoint,
                };

            case "azure":
                return {
                    keyVaultEndpoint: provider.masterKey.keyVaultEndpoint,
                    keyName: provider.masterKey.keyName,
                    keyVersion: provider.masterKey.keyVersion,
                };

            case "gcp":
                return {
                    projectId: provider.masterKey.projectId,
                    location: provider.masterKey.location,
                    keyRing: provider.masterKey.keyRing,
                    keyName: provider.masterKey.keyName,
                    keyVersion: provider.masterKey.keyVersion,
                    endpoint: provider.masterKey.endpoint,
                };

            case "kmip":
                return provider.masterKey; // may be undefined or { keyId }
        }
    }
}
