import { EEncryptionAlgorithm } from '../enums/enums';
import { ICollectionEncryptionSchema, IEncryptionSchema, TBsonType, IEncryptDefinition, IEncryptedField } from '../types/schema';
import { SchemaError, ValidationError } from '../errors/errors';

const deterministicSupportedTypes: TBsonType[] = [
    "string",
    "int",
    "long",
    "date",
    "objectId",
    "uuid" as TBsonType, // Adding as TBsonType since uuid may not be in TBsonType
];

/**
 * Validates a MongoDB Client-Side Field Level Encryption (CSFLE) schema
 * 
 * @param schemaObj - The schema to validate
 * @param collectionName - The collection name for context in error messages
 * @returns true if the schema is valid
 * @throws {SchemaError} If the schema is invalid
 */
function validateCSFLESchema(schemaObj: IEncryptionSchema, collectionName: string = "root"): boolean {
    try {
        if (!schemaObj || typeof schemaObj !== "object" || Object.keys(schemaObj).length === 0) {
            throw new SchemaError("Schema cannot be empty");
        }

        for (const [_, schema] of Object.entries(schemaObj)) {
            if (typeof schema !== "object" || schema === null) {
                throw new SchemaError(
                    `Schema for '${collectionName}' must be a non-null object.`
                );
            }

            recursiveValidate(schema, collectionName);
        }

        return true;
    } catch (error: any) {
        if (error instanceof SchemaError) {
            throw error;
        }
        throw new SchemaError(`Schema validation failed: ${error.message}`);
    }
}

/**
 * Validates an encrypt definition for a field
 * 
 * @param field - Field name
 * @param encryptDef - Encrypt definition to validate
 * @throws {SchemaError} If the encrypt definition is invalid
 */
function validateEncrypt(field: string, encryptDef: IEncryptDefinition): void {
    if (typeof encryptDef !== "object") {
        throw new SchemaError(`Invalid encrypt definition for field '${field}'.`);
    }

    if (!encryptDef.bsonType) {
        throw new SchemaError(`Missing bsonType for encrypted field '${field}'.`);
    }
    if (!encryptDef.algorithm) {
        throw new SchemaError(`Missing algorithm for encrypted field '${field}'.`);
    }

    const bsonType = encryptDef.bsonType;
    const algorithm = encryptDef.algorithm;

    if (
        algorithm === EEncryptionAlgorithm.DETERMINISTIC &&
        !deterministicSupportedTypes.includes(bsonType)
    ) {
        throw new SchemaError(
            `Invalid schema for '${field}': bsonType '${bsonType}' is not supported with Deterministic algorithm. ` +
            `Supported types for deterministic encryption are: ${deterministicSupportedTypes.join(", ")}`
        );
    }
}


/**
 * Recursively validates a schema object
 * 
 * @param obj - The object to validate
 * @param parentPath - Path for context in error messages
 * @throws {SchemaError} If the schema is invalid
 */
function recursiveValidate(obj: any, parentPath: string): void {
    if (typeof obj !== "object" || obj === null) {
        throw new SchemaError(
            `Invalid schema at '${parentPath}': must be an object definition.`
        );
    }

    if (obj.properties) {
        if (obj.bsonType !== "object") {
            throw new SchemaError(
                `Invalid schema at '${parentPath}': fields with 'properties' must have bsonType 'object'.`
            );
        }
        if (Object.keys(obj.properties).length === 0) {
            throw new SchemaError(
                `Invalid schema at '${parentPath}': 'properties' must not be empty.`
            );
        }
    }

    // If encrypt exists, validate it
    if (obj.encrypt) {
        validateEncrypt(parentPath, obj.encrypt);
    }

    // Recurse into properties
    if (obj.properties) {
        for (const [key, value] of Object.entries(obj.properties)) {
            recursiveValidate(value, `${parentPath}.${key}`);
        }
    }

    // Recurse into patternProperties
    if (obj.patternProperties) {
        if (obj.bsonType !== "object") {
            throw new SchemaError(
                `Invalid schema at '${parentPath}': 'patternProperties' must be inside bsonType 'object'.`
            );
        }
        for (const [pattern, value] of Object.entries(obj.patternProperties)) {
            recursiveValidate(value, `${parentPath}{${pattern}}`);
        }
    }

    // Define allowed keys
    const allowedKeys = [
        "bsonType",
        "properties",
        "patternProperties",
        "encrypt",
        "encryptMetadata",
        "description",
        "title",
        "required",
    ];

    // Detect invalid keys
    for (const key of Object.keys(obj)) {
        if (!allowedKeys.includes(key)) {
            throw new SchemaError(
                `Invalid key '${key}' found at '${parentPath}'. Allowed keys are: ${allowedKeys.join(", ")}`
            );
        }
    }
}

export { validateCSFLESchema };