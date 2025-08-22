import { MongoClient } from "mongodb";
import path from "path";
import { ServerEncryptionService, generateLocalKey, validateCryptSharedLib } from "../../src";
import { validateCSFLESchema } from "../../src/utils/schema.utils";
import { IKMSProvider } from "../../src/types/kms";
import { IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "../../src/types/schema";


describe("Integration", () => {
    describe("ServerEncryptionService", () => {
        it("should encrypt and decrypt fields using local KMS", async () => {

            const mongoURI = "";

            const kmsProvider: IKMSProvider = {
                type: "local",
                local: {
                    key: generateLocalKey()
                }
            }

            const keyVault: IKeyVault = {
                database: "encryption",
                collection: "_keys_"
            }

            const cryptSharedFilePath: TCryptSharedFilePath = path.resolve("config", "")
            const schemaFilePath: TSchemaFilePath = path.resolve("config")

            const service = new ServerEncryptionService(
                mongoURI,
                kmsProvider,
                keyVault,
                cryptSharedFilePath
            )

            await service.initializeWithFile(schemaFilePath)

            const schema = service.getSchema();

            expect(validateCSFLESchema(schema)).toBe(true);

        })
    })
})