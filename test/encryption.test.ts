import { ILocalKMSProvider } from "../src/types/kms";
import { ServerEncryptionService } from "../src/encryption";

import { MongoClientOptions } from "mongodb";
import { EEncryptionAlgorithm, IEncryptionSchema, IKeyVault } from "../src/types/schema";

describe("ServerEncryptionService", () => {
    let service: ServerEncryptionService;

    beforeEach(() => {
        const mongoUri = "mongodb://localhost:27017";
        const kmsProvider: ILocalKMSProvider = {
            type: "local",
            local: { key: Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64") }
        };
        const keyVault: IKeyVault = {
            database: "encryption",
            collection: "__keyVault"
        };
        const cryptSharedFilePath = "./config/mongo_crypt_v1.dll";


        service = new ServerEncryptionService(mongoUri, kmsProvider, keyVault, cryptSharedFilePath);

    });

    it("should initialize with empty options", () => {
        const options: MongoClientOptions = {};

        const schema: IEncryptionSchema = {
            "test.patient": {
                bsonType: "object",
                properties: {
                    "name": {
                        encrypt: {
                            keyId: [],
                            algorithm: EEncryptionAlgorithm.AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic,
                            bsonType: "string"
                        }
                    },
                    "phoneNumber": {
                        encrypt: {
                            keyId: [],
                            algorithm: EEncryptionAlgorithm.AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic,
                            bsonType: "string"
                        }
                    }
                }
            }
        };

        service.initializeWithSchema(schema);
        expect(service).toBeDefined();
    });
});


