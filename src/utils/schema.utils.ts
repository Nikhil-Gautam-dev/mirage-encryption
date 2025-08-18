

// export async function generateCsfleSchema(kmsProviders: KMSProviders, config: EncryptionMedocConfig) {
//     // Use custom schema file path if provided, otherwise fall back to default
//     const schemaFilePath = config.schema?.filePath
//         ? config.schema.filePath
//         : p.join(__dirname, "../conf/schema.json");

//     // Check if the schema file exists
//     if (!fs.existsSync(schemaFilePath)) {
//         throw new Error(`Schema file not found at path: ${schemaFilePath}`);
//     }

//     const jsonArray: CollectionSchema[] = JSON.parse(fs.readFileSync(schemaFilePath, 'utf-8'));
//     const schemaMap: Record<string, JsonSchema> = {};
//     const client = new MongoClient(createMongoUri(config));

//     await createIndexesOnKeyVault(client, config);

//     for (const collectionDef of jsonArray) {
//         const [collectionName] = Object.keys(collectionDef);
//         const fields = collectionDef[collectionName];

//         const properties: Record<string, any> = {};

//         for (const [fieldName, fieldType] of Object.entries(fields)) {
//             const bsonType = Array.isArray(fieldType) ? 'array' : fieldType.toLowerCase();
//             const algorithm = config.encryption?.algorithm || 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
//             const altName = `${collectionName}.${fieldName}`;
//             const dekId = await ensureDekForField(client, kmsProviders, altName, config);

//             properties[fieldName] = {
//                 encrypt: {
//                     keyId: dekId,
//                     bsonType: bsonType,
//                     algorithm: algorithm
//                 }
//             };
//         }

//         schemaMap[collectionName] = {
//             bsonType: 'object',
//             properties: properties
//         };

//         console.log(`Processed schema for collection: ${collectionName}`);
//     }

//     await client.close();
//     return schemaMap;
// }

// export async function generateCsfleSchemaForLocal(mongoUri: string, path?: string) {
//     const schemaFilePath = path
//         ? path
//         : p.join(__dirname, "../conf/schema.json");

//     // Check if the schema file exists
//     if (!fs.existsSync(schemaFilePath)) {
//         throw new Error(`Schema file not found at path: ${schemaFilePath}`);
//     }

//     const jsonArray: CollectionSchema[] = JSON.parse(fs.readFileSync(schemaFilePath, 'utf-8'));
//     const schemaMap: Record<string, JsonSchema> = {};
//     const client = new MongoClient(mongoUri);

//     // await createIndexesOnKeyVault(client, config);

//     for (const collectionDef of jsonArray) {
//         const [collectionName] = Object.keys(collectionDef);
//         const fields = collectionDef[collectionName];

//         const properties: Record<string, any> = {};

//         for (const [fieldName, fieldType] of Object.entries(fields)) {
//             const bsonType = Array.isArray(fieldType) ? 'array' : fieldType.toLowerCase();
//             const algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
//             const altName = `${collectionName}.${fieldName}`;
//             const dekId = await ensureDekForFieldForLocal(client, altName);

//             properties[fieldName] = {
//                 encrypt: {
//                     keyId: [dekId],
//                     bsonType: bsonType,
//                     algorithm: algorithm
//                 }
//             };
//         }

//         schemaMap[collectionName] = {
//             bsonType: 'object',
//             properties: properties
//         };

//         console.log(`Processed schema for collection: ${collectionName}`);
//     }

//     await client.close();
//     return schemaMap;
// }

// export async function ensureDekForFieldForLocal(
//     client: MongoClient,
//     fieldKeyAltName: string,
// ): Promise<any> {
//     await client.connect();
//     const keyVault = client.db("encryption").collection("__keyVault");

//     // Check if DEK already exists
//     const existingKey = await keyVault.findOne({ keyAltNames: fieldKeyAltName });
//     if (existingKey) {
//         return existingKey?._id;
//     }

//     const localKeyPath = "local-master-key.txt"

//     if (!fs.existsSync(localKeyPath)) {
//         throw new Error(`Schema file not found at path: ${localKeyPath}`);
//     }
//     const localMasterKey = Buffer.from(
//         fs.readFileSync("local-master-key.txt").toString(),
//         "base64"
//     );
//     const keyVaultNamespace = "encryption.__keyVault";
//     const kmsProviders = {
//         local: {
//             key: localMasterKey,
//         },
//     }
//     const encryption = new ClientEncryption(client, {
//         keyVaultNamespace: keyVaultNamespace,
//         kmsProviders: kmsProviders,
//     });

//     // Create new DEK for this field
//     const dekId = await encryption.createDataKey("local", {
//         keyAltNames: [fieldKeyAltName]
//     });

//     await client.close();
//     console.log(`Created DEK for ${fieldKeyAltName}`);
//     return dekId;
// }

// export async function ensureDekForField(
//     client: MongoClient,
//     kmsProviders: KMSProviders,
//     fieldKeyAltName: string,
//     config: EncryptionMedocConfig
// ): Promise<string | undefined> {
//     await client.connect();
//     const keyVault = client.db(config.keyVault.database).collection(config.keyVault.collection);

//     // Check if DEK already exists
//     const existingKey = await keyVault.findOne({ keyAltNames: fieldKeyAltName });
//     if (existingKey) {
//         return existingKey?._id.toString('base64');
//     }
//     const encryption = new ClientEncryption(client, {
//         keyVaultNamespace: config.keyVault.namespace!,
//         kmsProviders: kmsProviders,
//     });
//     // Create new DEK for this field
//     const dekId = await encryption.createDataKey('azure', {
//         masterKey: {
//             keyName: config.azure.keyName,
//             keyVaultEndpoint: config.azure.keyVaultEndpoint
//         },
//         keyAltNames: [fieldKeyAltName]
//     });
//     await client.close();
//     console.log(`Created DEK for ${fieldKeyAltName}`);
//     return dekId.toString('base64');
// }