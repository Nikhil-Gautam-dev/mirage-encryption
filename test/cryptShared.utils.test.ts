import path from "path"
import { validateCryptSharedLib } from "../src"


describe("cryptSharedLib utils", () => {
    it("should validate the library", () => {
        const file = path.resolve("config", "mongo_crypt_v1.dll")

        expect(validateCryptSharedLib(file)).toBe(file)
    })
    it("should throw an error for incorrect file path", () => {
        const file = path.resolve("config", "no_path_file.dll")

        expect(() => validateCryptSharedLib(file)).toThrow(/crypt_shared library not found a/)
    })
    it("should throw an error for invalid library", () => {
        const file = path.resolve("config", "lib.dll")

        expect(() => validateCryptSharedLib(file)).toThrow(/File exists but does not appear to be a valid /)
    })
    it("should throw an error for unsupported file type extension", () => {
        const file = path.resolve("config", "test.txt")

        expect(() => validateCryptSharedLib(file)).toThrow(/Invalid crypt_shared library extension for current platform/)
    })
})