import * as fs from "fs";
import { DekManager } from "./dekManager";
import { IEncryptionSchema, TBsonType, TProperties, TSchemaFilePath } from "./types/schema";
import { EEncryptionAlgorithm } from "./enums/enums";

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
      schemaMap[collectionName] = {
        bsonType: "object",
        properties: await this.processFields(fields, collectionName),
      };
    }

    return schemaMap;
  }

  private async processFields(fields: FieldMap, collectionName: string, parentPath = ""): Promise<Record<string, TProperties>> {
    const properties: Record<string, TProperties> = {};

    for (const [fieldName, fieldType] of Object.entries(fields)) {

      const fullPath = parentPath
        ? `${parentPath}.${fieldName}`
        : `${collectionName}.${fieldName}`;

      const bsonType: string = typeof fieldType === "string" ? fieldType.toLowerCase() : "object";

      // Fetch DEK for this field
      const dekId = await this.dekManager.getDEK(fullPath);

      if (bsonType === "object" && typeof fieldType === "object") {
        properties[fieldName] = {
          bsonType: "object",
          properties: await this.processFields(fieldType, collectionName, fullPath),
        };
      } else {
        let algorithm: EEncryptionAlgorithm;
        switch (bsonType) {
          case "array":
          case "object":
          case "bool":
          case "double":
          case "decimal128":
            algorithm = EEncryptionAlgorithm.RANDOM;
            break;
          default:
            algorithm = EEncryptionAlgorithm.DETERMINISTIC;
        }

        properties[fieldName] = {
          encrypt: {
            keyId: [dekId],
            bsonType: bsonType as TBsonType,
            algorithm,
          },
        };
      }
    }

    return properties;
  };

}
