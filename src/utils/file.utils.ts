import { existsSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

export function fileExists(filePath: string): boolean {
    return existsSync(filePath);
}


/**
 * Generate a 96-byte random master key for MongoDB CSFLE local KMS provider.
 * Saves it to `local-master-key.txt` in base64 format.
 */
export function generateLocalMasterKey(filePath: string = "local-master-key.txt"): string {
    // Generate 96 random bytes
    const masterKey = randomBytes(96);

    // Encode to base64 for storage
    const base64Key = masterKey.toString("base64");

    // Save to file (only if not already present)
    if (!fileExists(filePath)) {
        writeFileSync(filePath, base64Key);
        console.info(`Local master key generated and saved to ${filePath}`);
    } else {
        console.info(`⚠️ Master key already exists at ${filePath}, not overwritten.`);
    }

    return base64Key;
}
