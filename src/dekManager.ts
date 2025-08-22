import { Binary, ClientEncryption, MongoClient, } from "mongodb";
import {
    IKMSProvider
} from "./types/kms";
import { IKeyVault, IKeyVaultDocument } from "./types/schema";
import { EncryptionError, KMSError } from "./errors/errors";
import { IKmsProviderConfig, IMasterKeyConfig } from "./types/config";

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

    /**
     * Gets or creates a Data Encryption Key (DEK) for a specific field
     * 
     * @param fieldKeyAltName - The alternate name for the key, typically the field path
     * @returns A Binary representing the DEK ID
     * @throws {EncryptionError} If there's an issue retrieving or creating the DEK
     */
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
        } catch (error: any) {
            throw new EncryptionError(`Failed to create or retrieve DEK for ${fieldKeyAltName}: ${error.message || String(error)}`);
        }
        finally {
            await this.mongoClient.close();
        }
    }

    /**
     * Returns the kmsProviders configuration expected by ClientEncryption.
     * 
     * @param provider - The KMS provider configuration
     * @returns KMS provider configuration formatted for ClientEncryption
     * @throws {KMSError} If the provider type is not supported
     */
    private getKmsProviderConfig(provider: IKMSProvider): IKmsProviderConfig {
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
                // This should never happen due to TypeScript checks, but as a safeguard
                throw new KMSError(`Unsupported KMS provider: ${String((provider as any).type)}`);
        }
    }

    /**
     * Returns the masterKey for createDataKey based on the KMS provider.
     * 
     * @param provider - The KMS provider configuration
     * @returns Master key configuration for the specified provider, or undefined for local provider
     */
    private getMasterKey(provider: IKMSProvider): IMasterKeyConfig | undefined {
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
