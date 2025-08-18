import path from "path";
import { fileExists } from "../src/utils/file.utils"

describe("fileExists", () => {
    it("should return true for existing files", () => {
        expect(fileExists(path.resolve("config", "test.txt"))).toBe(true);
    });

    it("should return false for non-existing files", () => {
        expect(fileExists("path/to/non-existing/file.txt")).toBe(false);
    });
});
