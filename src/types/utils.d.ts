/**
 * Checks if a file exists at the specified path.
 * @param filePath - The path to check for file existence
 * @returns `true` if the file exists, `false` otherwise
 */
export declare function fileExists(filePath: string): boolean;

/**
 * Generate a 96-byte random master key in base64 format.
 * @returns A newly generated base64-encoded master key
 */
export declare function getMasterKey(): string;

/**
 * Generate or retrieve a local master key for MongoDB CSFLE local KMS provider.
 * If the key already exists at the given path, read and return it.
 * Otherwise, generate a new one, save it, and return it.
 * @param filePath - Path to save/read the local master key (default: "local-master-key.txt")
 * @returns The base64-encoded master key
 */
export declare function generateLocalKey(filePath?: string): string;

/**
 * Validates the given crypt_shared library path:
 *  - Checks platform
 *  - Checks file exists
 *  - Checks correct extension
 *  - Checks file header matches expected shared library format
 *
 * @param libPath - Full path to the library file
 * @returns {string} - Returns validated path if correct
 * @throws {Error} - If invalid
 */
export declare function validateCryptSharedLib(libPath: string): string;
