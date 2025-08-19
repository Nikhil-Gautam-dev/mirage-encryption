/**
 * Types for utility functions used in the encryption system
 */

/**
 * Checks if a file exists at the specified path
 * 
 * @param filePath - Path to the file to check
 * @returns Boolean indicating if the file exists
 */
export declare function fileExists(filePath: string): boolean;

/**
 * Generates a 96-byte random master key for MongoDB CSFLE local KMS provider.
 * 
 * @param filePath - Path where the master key will be stored, defaults to "local-master-key.txt"
 * @returns The generated master key in base64 format
 */
export declare function generateLocalMasterKey(filePath?: string): string;