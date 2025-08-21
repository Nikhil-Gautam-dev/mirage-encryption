import { EEncryptionAlgorithm } from '../enums/enums';
import { ICollectionEncryptionSchema, IEncryptionSchema, TBsonType, IEncryptDefinition, IEncryptedField } from '../types/schema';

const deterministicSupportedTypes: TBsonType[] = [
    "string",
    "int",
    "long",
    "date",
    "objectId",
    "uuid" as TBsonType, // Adding as TBsonType since uuid may not be in TBsonType
];

function validateCSFLESchema(schemaObj: IEncryptionSchema, collectionName: string = "root"): boolean {

    for (const [_, schema] of Object.entries(schemaObj)) {

        if (typeof schema !== "object" || schema === null) {
            throw new Error(
                `Schema for '${collectionName}' must be a non-null object.`
            );
        }

        recursiveValidate(schema, collectionName);
    }


    return true;
}

function validateEncrypt(field: string, encryptDef: IEncryptDefinition): void {
    if (typeof encryptDef !== "object") {
        throw new Error(`Invalid encrypt definition for field '${field}'.`);
    }

    if (!encryptDef.bsonType) {
        throw new Error(`Missing bsonType for encrypted field '${field}'.`);
    }
    if (!encryptDef.algorithm) {
        throw new Error(`Missing algorithm for encrypted field '${field}'.`);
    }

    const bsonType = encryptDef.bsonType;
    const algorithm = encryptDef.algorithm;

    if (
        algorithm === EEncryptionAlgorithm.DETERMINISTIC &&
        !deterministicSupportedTypes.includes(bsonType)
    ) {
        throw new Error(
            `Invalid schema for '${field}': bsonType '${bsonType}' is not supported with Deterministic algorithm.`
        );
    }
}


function recursiveValidate(obj: any, parentPath: string): void {
    if (typeof obj !== "object" || obj === null) {
        throw new Error(
            `Invalid schema at '${parentPath}': must be an object definition.`
        );
    }

    if (obj.properties) {
        if (obj.bsonType !== "object") {
            throw new Error(
                `Invalid schema at '${parentPath}': fields with 'properties' must have bsonType 'object'.`
            );
        }
        if (Object.keys(obj.properties).length === 0) {
            throw new Error(
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
            throw new Error(
                `Invalid schema at '${parentPath}': 'patternProperties' must be inside bsonType 'object'.`
            );
        }
        for (const [pattern, value] of Object.entries(obj.patternProperties)) {
            recursiveValidate(value, `${parentPath}{${pattern}}`);
        }
    }

    // Detect invalid keys
    for (const key of Object.keys(obj)) {
        if (
            ![
                "bsonType",
                "properties",
                "patternProperties",
                "encrypt",
                "encryptMetadata",
                "description",
                "title",
                "required",
            ].includes(key)
        ) {
            throw new Error(
                `Invalid key '${key}' found at '${parentPath}'. Not allowed in schema definition.`
            );
        }
    }
}

export { validateCSFLESchema };