import { DekManager } from "../dekManager";
import { IEncryptionSchema, TSchemaFilePath } from "./schema";
import { EEncryptionAlgorithm } from "../enums/enums";

/**
 * Service for generating and managing CSFLE (Client-Side Field Level Encryption) schemas
 */
export declare class EncryptionSchemaService {
    /**
     * Creates a new EncryptionSchemaService instance
     * 
     * @param dekManager - DEK (Data Encryption Key) manager instance
     */
    constructor(dekManager: DekManager);

    /**
     * Generates a CSFLE schema map by reading a schema file and ensuring DEKs exist for each field
     * 
     * @param schemaFilePath - Path to the schema definition file
     * @param algorithm - Optional encryption algorithm to use (defaults to AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic)
     * @returns Promise resolving to the generated encryption schema
     */
    generateCSFLESchema(
        schemaFilePath: TSchemaFilePath,
        algorithm?: EEncryptionAlgorithm
    ): Promise<IEncryptionSchema>;
}

/**
 * Type definitions for schema structure
 */
export type FieldMap = { [key: string]: string };
export type CollectionSchema = { [collectionName: string]: FieldMap };
