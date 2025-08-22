import { existsSync, writeFileSync, readFileSync } from "fs";
import { randomBytes } from "crypto";
import { ValidationError } from "../errors/errors";


/**
 * Checks if a file exists at the specified path.
 * 
 * @param filePath - The path to check for file existence
 * @returns `true` if the file exists, `false` otherwise
 * @throws {ValidationError} If filePath is not provided
 */
export function fileExists(filePath: string): boolean {
    if (!filePath || filePath.trim() === '') {
        throw new ValidationError('File path must be provided');
    }
    return existsSync(filePath);
}


/**
 * Generate a 96-byte random master key in base64 format.
 * 
 * @returns A base64 encoded 96-byte random key
 */
export function getMasterKey(): string {
    const masterKey = randomBytes(96);
    return masterKey.toString("base64");
}

/**
 * Generate or retrieve a local master key for MongoDB CSFLE local KMS provider.
 * If the key already exists at the given path, read and return it.
 * Otherwise, generate a new one, save it, and return it.
 * 
 * @param filePath - Path to store/retrieve the key
 * @returns The base64 encoded master key
 * @throws {ValidationError} If file operations fail
 */
export function generateLocalKey(filePath: string = "local-master-key.txt"): string {
    try {
        if (existsSync(filePath)) {
            const content = readFileSync(filePath, "utf-8").trim();
            if (!content) {
                throw new ValidationError(`Master key file exists but is empty: ${filePath}`);
            }
            return content;
        }

        const base64Key = getMasterKey();
        writeFileSync(filePath, base64Key);
        return base64Key;
    } catch (error: any) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError(`Failed to generate or retrieve local key: ${error.message}`);
    }
}
