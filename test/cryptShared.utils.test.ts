import path from "path";
import fs from "fs";
import os from "os";
import { validateCryptSharedLib } from "../src";

jest.mock("fs");
jest.mock("os");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

describe("cryptSharedLib utils", () => {
    const fakePath = (filename: string) => path.resolve("config", filename);

    beforeEach(() => {
        jest.resetAllMocks();
    });

    function mockFileWithMagic(magic: Buffer) {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.openSync.mockReturnValue(1); // fake fd

        // Fix typing issue here ✅
        (mockedFs.readSync as any).mockImplementation((_fd: number, buffer: Buffer) => {
    magic.copy(buffer, 0, 0, magic.length);
    return magic.length;
});

        mockedFs.closeSync.mockReturnValue(undefined);
    }

    it("should validate the library (Windows)", () => {
        mockedOs.platform.mockReturnValue("win32");

        const file = fakePath("mongo_crypt_v1.dll");
        mockFileWithMagic(Buffer.from("MZ")); // PE header

        expect(validateCryptSharedLib(file)).toBe(file);
    });

    it("should validate the library (Linux)", () => {
        mockedOs.platform.mockReturnValue("linux");

        const file = fakePath("mongo_crypt_v1.so");
        mockFileWithMagic(Buffer.from([0x7F, 0x45, 0x4C, 0x46])); // ELF

        expect(validateCryptSharedLib(file)).toBe(file);
    });

    it("should throw an error for incorrect file path", () => {
        mockedOs.platform.mockReturnValue("win32");

        const file = fakePath("no_path_file.dll");
        mockedFs.existsSync.mockReturnValue(false);

        expect(() => validateCryptSharedLib(file)).toThrow(/crypt_shared library not found/);
    });

    it("should throw an error for invalid library magic", () => {
        mockedOs.platform.mockReturnValue("linux");

        const file = fakePath("lib.so");
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.openSync.mockReturnValue(1);

        mockedFs.readSync.mockImplementation((_fd, buffer: any) => {
            buffer.write("xxxx"); // wrong magic
            return 4;
        });

        mockedFs.closeSync.mockReturnValue(undefined);

        expect(() => validateCryptSharedLib(file)).toThrow(/File exists but does not appear to be a valid linux shared library/);
    });

    it("should throw an error for unsupported file type extension", () => {
        mockedOs.platform.mockReturnValue("darwin");

        const file = fakePath("test.txt");
        mockedFs.existsSync.mockReturnValue(true);

        expect(() => validateCryptSharedLib(file)).toThrow(/Invalid crypt_shared library extension/);
    });
});
