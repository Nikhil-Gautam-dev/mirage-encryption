import { existsSync, writeFileSync, readFileSync } from "fs";
import { randomBytes } from "crypto";


/**
 * Checks if a file exists at the specified path.
 * @param filePath - The path to check for file existence
 * @returns `true` if the file exists, `false` otherwise
 */
export function fileExists(filePath: string): boolean {
    return existsSync(filePath);
}


/**
 * Generate a 96-byte random master key in base64 format.
 */
export function getMasterKey(): string {
    const masterKey = randomBytes(96);
    return masterKey.toString("base64");
}

/**
 * Generate or retrieve a local master key for MongoDB CSFLE local KMS provider.
 * If the key already exists at the given path, read and return it.
 * Otherwise, generate a new one, save it, and return it.
 */
export function generateLocalKey(filePath: string = "local-master-key.txt"): string {
    if (existsSync(filePath)) {
        return readFileSync(filePath, "utf-8").trim();
    }

    const base64Key = getMasterKey();
    writeFileSync(filePath, base64Key);
    return base64Key;
}
