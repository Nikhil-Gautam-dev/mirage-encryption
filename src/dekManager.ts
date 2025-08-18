import { ClientEncryption, MongoClient } from "mongodb";
import { IKMSProvider } from "./types/kms";
import { IKeyVault } from "./types/schema";


export class DekManager {

    public readonly mongoClient: MongoClient;
    private readonly keyVaultNamespace: string;
    private readonly kmsProvider: IKMSProvider;

    constructor(mongoClient: MongoClient, keyVaultNamespace: string, kmsProvider: IKMSProvider) {
        this.mongoClient = mongoClient;
        this.keyVaultNamespace = keyVaultNamespace;
        this.kmsProvider = kmsProvider;
    }

    public async getDEK(fieldKeyAltName: string): Promise<string> {

        await this.mongoClient.connect();

        const keyVault = this.mongoClient.db("encryption").collection("__keyVault");

        const existingKey = await keyVault.findOne({ keyAltNames: fieldKeyAltName });

        if (existingKey) {
            return existingKey._id.toString();
        }

        this.mongoClient.close();

        const encryption = new ClientEncryption(
            this.mongoClient,
            {
                keyVaultNamespace: this.keyVaultNamespace,
                kmsProviders: this.kmsProvider as any,
            }
        );

        const masterKey = this.getMasterKey(this.kmsProvider);
        const dekId = await encryption.createDataKey(this.kmsProvider.type, {
            masterKey,
            keyAltNames: [fieldKeyAltName]
        });

        return dekId.toString();
    }

    public getMasterKey(provider: IKMSProvider): Record<string, any> | undefined {
        switch (provider.type) {
            case "local":
                return undefined;

            case "azure":
                return {
                    keyVaultEndpoint: "https://<your-key-vault-name>.vault.azure.net/",
                    keyName: "your-key-name",
                };

            default:
                throw new Error(`Unsupported KMS provider: ${(provider as any).type}`);
        }
    }
}