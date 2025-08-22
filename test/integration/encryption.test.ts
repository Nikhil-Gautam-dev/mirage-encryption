import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import { ServerEncryptionService, generateLocalKey } from "../../src";
import { validateCSFLESchema } from "../../src/utils/schema.utils";
import { IKMSProvider } from "../../src/types/kms";
import { IKeyVault, TCryptSharedFilePath, TSchemaFilePath } from "../../src/types/schema";
import os from "node:os";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

describe("Integration", () => {
    const mongoURI = "mongodb://localhost:27017";
    let cryptSharedFilePath: TCryptSharedFilePath = "";
    let schemaFilePath: TSchemaFilePath = path.resolve("config", `${randomUUID().substring(0,6)}.json`);
    const database = randomUUID().substring(12);
    const patientCollection = "patients";

    const keyVault: IKeyVault = {
        database: randomUUID().substring(12),
        collection: "_keys_"
    };
    const schemaToSave = [
        {
            [`${database}.${patientCollection}`]: {
                age: "int",
                hobbies: "array",
                isActive: "bool",
                address: {
                    street: "string",
                    city: "string",
                    zip: "string",
                    state: "string"
                }
            }
        }
    ];

    const dataToInsert = {
        name: "john",
        age: 21,
        isActive: true,
        address: {
            street: "street-7",
            city: "city-7",
            zip: "zip-7",
            state: "state-7"
        }
    };

    let client: MongoClient;

    beforeAll(() => {
        const platform = os.platform();
        switch (platform) {
            case "win32":
                cryptSharedFilePath = path.resolve("config", "mongo_crypt_v1.dll");
                break;
            case "linux":
                cryptSharedFilePath = path.resolve("config", "mongo_crypt_v1.so");
                break;
            case "darwin":
                cryptSharedFilePath = path.resolve("config", "mongo_crypt_v1.dylib");
                break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }

        if (!fs.existsSync(cryptSharedFilePath)) {
            throw new Error(`crypt_shared library not found at: ${cryptSharedFilePath}`);
        }

        fs.writeFileSync(schemaFilePath, JSON.stringify(schemaToSave));
    });

    afterAll(async () => {
        if (fs.existsSync(schemaFilePath)) {
            fs.unlinkSync(schemaFilePath);
        }
        if (client) {
            await client.db(database).dropDatabase();
            await client.db(keyVault.database).dropDatabase();
            await client.close();
        }
    });

    describe("ServerEncryptionService", () => {
        it("should encrypt and decrypt fields using local KMS", async () => {

            const kmsProvider: IKMSProvider = {
                type: "local",
                local: {
                    key: generateLocalKey()
                }
            };


            const service = new ServerEncryptionService(
                mongoURI,
                kmsProvider,
                keyVault,
                cryptSharedFilePath
            );


            await service.initializeWithFile(schemaFilePath);

            const schema = service.getSchema();

            expect(validateCSFLESchema(schema)).toBe(true);

            client = service.getMongoClient();

            expect(client).toBeInstanceOf(MongoClient);

            await client.connect();

            const coll = client.db(database).collection(patientCollection);

            const result = await coll.insertOne(dataToInsert);

            expect(result.insertedId).toBeInstanceOf(ObjectId);

            expect(result.acknowledged).toBe(true);

            const insertedId = result.insertedId;

            const savedData = await coll.findOne({ _id: insertedId });

            if (savedData) {
                expect(savedData._id).toEqual(insertedId);
                expect(savedData.name).toBe(dataToInsert.name);
                expect(savedData.age).toBe(dataToInsert.age);
                expect(savedData.isActive).toBe(dataToInsert.isActive);
                expect(savedData.address).toEqual(dataToInsert.address);
            }
        });
    });
});
