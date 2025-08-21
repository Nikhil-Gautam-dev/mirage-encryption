import * as fs from "fs";
import { DekManager } from "./dekManager";
import { IEncryptedField, IEncryptionSchema, TBsonType, TSchemaFilePath } from "./types/schema";
import { EEncryptionAlgorithm } from "./enums/enums";
import { Binary } from "mongodb";

type FieldMap = { [key: string]: string };
type CollectionSchema = { [collectionName: string]: FieldMap };

export class EncryptionSchemaService {
  private readonly dekManager: DekManager;

  constructor(dekManager: DekManager) {
    this.dekManager = dekManager;
  }

  /**
   * Generate a CSFLE schema map by reading a schema file and ensuring DEKs exist for each field.
   */
  public async generateCSFLESchema(
    schemaFilePath: TSchemaFilePath,
    algorithm: EEncryptionAlgorithm = EEncryptionAlgorithm.AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic
  ): Promise<IEncryptionSchema> {

    if (!fs.existsSync(schemaFilePath)) {
      throw new Error("Schema file path not found: " + schemaFilePath);
    }

    const schemaFile = fs.readFileSync(schemaFilePath, "utf-8");

    // Parse schema JSON
    const jsonArray: CollectionSchema[] = JSON.parse(schemaFile);
    const schemaMap: IEncryptionSchema = {};

    for (const collectionDef of jsonArray) {
      const [collectionName] = Object.keys(collectionDef);
      const fields = collectionDef[collectionName];
      const properties: Record<string, IEncryptedField> = {};

      for (const [fieldName, fieldType] of Object.entries(fields)) {
        const bsonType = fieldType.toLowerCase();
        const altName = `${collectionName}.${fieldName}`;

        // Get or create DEK using DekManager
        const dekId = await this.dekManager.getDEK(altName);

        properties[fieldName] = {
          encrypt: {
            keyId: [dekId as Binary], // CSFLE expects array of keyIds
            bsonType: bsonType as TBsonType,
            algorithm: algorithm,
          },
        };
      }

      schemaMap[collectionName] = {
        bsonType: "object",
        properties: properties,
      };

    }

    return schemaMap;
  }
}
