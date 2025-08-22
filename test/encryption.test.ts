import path from "path";
import { generateLocalKey } from "../src/utils/file.utils";
import { ServerEncryptionService } from "../src";
import { validateCSFLESchema } from "../src/utils/schema.utils";


describe("encryption", () => {
    describe("initializeWithFile", () => {
        it("should load schema from file", async () => {
            const localKey = generateLocalKey();

            const service = new ServerEncryptionService(
                "mongodb://localhost:27017/",
                { type: "local", local: { key: localKey } },
                { database: "encryptionDB", collection: "__keyVault__" },
                path.resolve("config", 'mongo_crypt_v1.dll')
            );

            const schemaPath = path.resolve('config', 'schema.json');
            await service.initializeWithFile(schemaPath);

            const schema = service.getSchema();

            expect(validateCSFLESchema(schema)).toBe(true);

            // expect(service.getMongoClient()).toBeInstanceOf(MongoClient);
        });
    });
})