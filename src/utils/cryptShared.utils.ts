import fs from "fs";
import os from "os";

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
export function validateCryptSharedLib(libPath: string): string {
    const platform = os.platform();

    let expectedExt: string;
    let expectedMagic: Buffer[] = [];

    switch (platform) {
        case "win32":
            expectedExt = ".dll";
            expectedMagic = [Buffer.from("MZ")]; // Windows PE header
            break;
        case "darwin":
            expectedExt = ".dylib";
            expectedMagic = [
                Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O 32-bit
                Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
                Buffer.from([0xCA, 0xFE, 0xBA, 0xBE])  // Fat binaries
            ];
            break;
        case "linux":
            expectedExt = ".so";
            expectedMagic = [Buffer.from([0x7F, 0x45, 0x4C, 0x46])]; // ELF
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }

    // Check file existence
    if (!fs.existsSync(libPath)) {
        throw new Error(
            `crypt_shared library not found at: ${libPath}\nExpected a file ending with '${expectedExt}'`
        );
    }

    // Check extension
    if (!libPath.endsWith(expectedExt)) {
        throw new Error(
            `Invalid crypt_shared library extension for current platform.\n` +
            `Provided: '${libPath}'\nExpected extension: '${expectedExt}'`
        );
    }

    // Read first 4 bytes to check magic number
    const fd = fs.openSync(libPath, "r");
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const isValidMagic = expectedMagic.some(magic =>
        buffer.slice(0, magic.length).equals(magic)
    );

    if (!isValidMagic) {
        throw new Error(
            `File exists but does not appear to be a valid ${platform} shared library.\n` +
            `Magic bytes found: ${buffer.toString("hex")}`
        );
    }

    return libPath;
}