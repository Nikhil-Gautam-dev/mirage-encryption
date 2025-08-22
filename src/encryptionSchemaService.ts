import * as fs from "fs";
import { DekManager } from "./dekManager";
import { IEncryptionSchema, TBsonType, TProperties, TSchemaFilePath } from "./types/schema";
import { EEncryptionAlgorithm } from "./enums/enums";
import { ValidationError, EncryptionError } from "./errors/errors";

type FieldMap = { [key: string]: string };
type CollectionSchema = { [collectionName: string]: FieldMap };

export class EncryptionSchemaService {
  private readonly dekManager: DekManager;

  constructor(dekManager: DekManager) {
    this.dekManager = dekManager;
  }

  /**
   * Generate a CSFLE schema map by reading a schema file and ensuring DEKs exist for each field.
   * 
   * @param schemaFilePath - Path to the schema file
   * @returns Generated encryption schema
   * @throws {ValidationError} If the schema file is invalid
   * @throws {EncryptionError} If DEK creation or schema generation fails
   */
  public async generateCSFLESchema(
    schemaFilePath: TSchemaFilePath,
  ): Promise<IEncryptionSchema> {
    try {
      if (!fs.existsSync(schemaFilePath)) {
        throw new ValidationError(`Schema file not found: ${schemaFilePath}`);
      }

      const schemaFile = fs.readFileSync(schemaFilePath, "utf-8");

      // Parse schema JSON
      let jsonArray: CollectionSchema[];
      try {
        jsonArray = JSON.parse(schemaFile);
        if (!Array.isArray(jsonArray)) {
          throw new ValidationError(`Schema file must contain a JSON array`);
        }
      } catch (error: any) {
        throw new ValidationError(`Invalid JSON in schema file: ${error.message}`);
      }

      const schemaMap: IEncryptionSchema = {};

      for (const collectionDef of jsonArray) {
        const collectionNames = Object.keys(collectionDef);
        if (collectionNames.length !== 1) {
          throw new ValidationError(`Each schema definition must contain exactly one collection name`);
        }

        const collectionName = collectionNames[0];
        const fields = collectionDef[collectionName];

        schemaMap[collectionName] = {
          bsonType: "object",
          properties: await this.processFields(fields, collectionName),
        };
      }

      return schemaMap;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(`Failed to generate CSFLE schema: ${error.message}`);
    }
  }

  /**
   * Process fields in the schema to create encrypted field definitions
   * 
   * @param fields - Map of field names to types
   * @param collectionName - Name of the collection
   * @param parentPath - Parent path for nested fields
   * @returns Processed properties with encryption configuration
   * @throws {EncryptionError} If DEK creation fails or field processing fails
   */
  private async processFields(fields: FieldMap, collectionName: string, parentPath = ""): Promise<Record<string, TProperties>> {
    const properties: Record<string, TProperties> = {};

    try {
      for (const [fieldName, fieldType] of Object.entries(fields)) {
        const fullPath = parentPath
          ? `${parentPath}.${fieldName}`
          : `${collectionName}.${fieldName}`;

        const bsonType: string = typeof fieldType === "string" ? fieldType.toLowerCase() : "object";

        // Fetch DEK for this field
        try {
          const dekId = await this.dekManager.getDEK(fullPath);

          if (bsonType === "object" && typeof fieldType === "object") {
            properties[fieldName] = {
              bsonType: "object",
              properties: await this.processFields(fieldType, collectionName, fullPath),
            };
          } else {
            // Determine appropriate encryption algorithm based on field type
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

            // Validate BSON type
            this.validateBsonType(bsonType, fullPath);

            properties[fieldName] = {
              encrypt: {
                keyId: [dekId],
                bsonType: bsonType as TBsonType,
                algorithm,
              },
            };
          }
        } catch (error: any) {
          throw new EncryptionError(`Failed to process field ${fullPath}: ${error.message}`);
        }
      }
    } catch (error: any) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(`Failed to process fields: ${error.message}`);
    }

    return properties;
  };

  /**
   * Validate if a string is a valid BSON type
   * 
   * @param bsonType - Type to validate
   * @param fieldPath - Path to the field (for error messages)
   * @throws {ValidationError} If the type is not a valid BSON type
   */
  private validateBsonType(bsonType: string, fieldPath: string): void {
    const validTypes = [
      "double", "string", "object", "array", "binData", "undefined",
      "objectId", "bool", "date", "null", "regex", "dbPointer",
      "javascript", "symbol", "javascriptWithScope", "int", "timestamp",
      "long", "decimal", "minKey", "maxKey", "decimal128"
    ];

    if (!validTypes.includes(bsonType)) {
      throw new ValidationError(
        `Invalid BSON type '${bsonType}' for field '${fieldPath}'. Valid types are: ${validTypes.join(", ")}`
      );
    }
  }

}
