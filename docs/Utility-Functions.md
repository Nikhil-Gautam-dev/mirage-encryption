# Utility Functions

The mirage-encryption package provides a set of utility functions to help with common tasks related to MongoDB Client-Side Field Level Encryption (CSFLE).

## Table of Contents

- [File Utilities](#file-utilities)
  - [fileExists](#fileexists)
  - [generateLocalKey](#generatelocalkey)
  - [getMasterKey](#getmasterkey)
- [Validation Utilities](#validation-utilities)
  - [validateCryptSharedLib](#validatecryptsharedlib)
  - [validateCSFLESchema](#validatecsfleschema)
- [Use Cases](#use-cases)
  - [Handling Platform-Specific Crypt Shared Libraries](#handling-platform-specific-crypt-shared-libraries)
  - [Local Key Generation and Management](#local-key-generation-and-management)
  - [Schema Validation](#schema-validation)
- [Best Practices](#best-practices)

## File Utilities

### fileExists

Checks if a file exists at the specified path.

```typescript
function fileExists(filePath: string): boolean;
```

**Parameters:**

- `filePath` (string): The path to check for file existence

**Returns:**

- `boolean`: `true` if the file exists, `false` otherwise

**Throws:**

- `ValidationError`: If `filePath` is not provided or is empty

**Example:**

```typescript
import { fileExists } from "mirage-encryption";

if (fileExists("./config/schema.json")) {
  console.log("Schema file exists");
} else {
  console.log("Schema file does not exist");
}
```

### generateLocalKey

Generates or retrieves a local master key for MongoDB CSFLE local KMS provider.

```typescript
function generateLocalKey(filePath: string = "local-master-key.txt"): string;
```

**Parameters:**

- `filePath` (string, optional): Path to store or retrieve the key (defaults to "local-master-key.txt")

**Returns:**

- `string`: A base64 encoded 96-byte random key

**Throws:**

- `ValidationError`: If file operations fail or the key file is empty

**Example:**

```typescript
import { generateLocalKey } from "mirage-encryption";

// Generate or retrieve a key from the default location
const key = generateLocalKey();

// Generate or retrieve a key from a custom location
const customKey = generateLocalKey("./keys/my-custom-key.txt");
```

### getMasterKey

Generates a 96-byte random master key in base64 format.

```typescript
function getMasterKey(): string;
```

**Returns:**

- `string`: A base64 encoded 96-byte random key

**Example:**

```typescript
import { getMasterKey } from "mirage-encryption";

// Generate a new random master key
const key = getMasterKey();
```

## Validation Utilities

### validateCryptSharedLib

Validates the given crypt_shared library path.

```typescript
function validateCryptSharedLib(libPath: string): string;
```

**Parameters:**

- `libPath` (string): Full path to the library file

**Returns:**

- `string`: Returns the validated path if correct

**Throws:**

- `ValidationError`: If the library path is invalid, the file doesn't exist, or the file is not a valid shared library for the current platform

**Example:**

```typescript
import { validateCryptSharedLib } from "mirage-encryption";
import path from "path";
import os from "os";

// Get the appropriate library path based on platform
let cryptSharedPath;
switch (os.platform()) {
  case "win32":
    cryptSharedPath = path.resolve("./lib/mongo_crypt_v1.dll");
    break;
  case "darwin":
    cryptSharedPath = path.resolve("./lib/mongo_crypt_v1.dylib");
    break;
  case "linux":
    cryptSharedPath = path.resolve("./lib/mongo_crypt_v1.so");
    break;
  default:
    throw new Error(`Unsupported platform: ${os.platform()}`);
}

try {
  validateCryptSharedLib(cryptSharedPath);
  console.log("Crypt shared library is valid");
} catch (error) {
  console.error("Invalid crypt shared library:", error.message);
}
```

### validateCSFLESchema

Validates a MongoDB CSFLE schema for correctness.

```typescript
function validateCSFLESchema(schema: any): boolean;
```

**Parameters:**

- `schema` (any): The schema object to validate

**Returns:**

- `boolean`: `true` if the schema is valid

**Throws:**

- `ValidationError`: If the schema is invalid

**Example:**

```typescript
import { validateCSFLESchema } from "mirage-encryption";

try {
  const isValid = validateCSFLESchema(mySchema);
  console.log("Schema is valid:", isValid);
} catch (error) {
  console.error("Schema validation failed:", error.message);
}
```

## Use Cases

### Handling Platform-Specific Crypt Shared Libraries

MongoDB CSFLE requires a platform-specific crypt_shared library. The `validateCryptSharedLib` function helps ensure the correct library is used:

```typescript
import { validateCryptSharedLib } from "mirage-encryption";
import path from "path";
import os from "os";

function getCryptSharedLibPath() {
  let libPath;

  switch (os.platform()) {
    case "win32":
      libPath = path.resolve("./lib/mongo_crypt_v1.dll");
      break;
    case "darwin":
      libPath = path.resolve("./lib/mongo_crypt_v1.dylib");
      break;
    case "linux":
      libPath = path.resolve("./lib/mongo_crypt_v1.so");
      break;
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }

  try {
    return validateCryptSharedLib(libPath);
  } catch (error) {
    console.error(`Error validating crypt_shared library: ${error.message}`);
    console.error(
      "Please download the appropriate library from MongoDB Download Center."
    );
    process.exit(1);
  }
}

// Use the function to get a validated library path
const cryptSharedPath = getCryptSharedLibPath();
```

### Local Key Generation and Management

For development or testing environments, you can use the local key generation utilities:

```typescript
import { generateLocalKey } from "mirage-encryption";
import fs from "fs";
import path from "path";

// Ensure keys directory exists
const keysDir = path.resolve("./keys");
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate environment-specific keys
const devKey = generateLocalKey(path.join(keysDir, "dev-key.txt"));
const testKey = generateLocalKey(path.join(keysDir, "test-key.txt"));
const stagingKey = generateLocalKey(path.join(keysDir, "staging-key.txt"));

// Use these keys in your KMS provider configuration
const kmsProvider = {
  type: "local",
  local: {
    key: process.env.NODE_ENV === "test" ? testKey : devKey,
  },
};
```

### Schema Validation

Before using a schema with MongoDB CSFLE, validate it to catch issues early:

```typescript
import { validateCSFLESchema } from "mirage-encryption";
import fs from "fs";

function loadAndValidateSchema(schemaPath) {
  try {
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    validateCSFLESchema(schema);
    return schema;
  } catch (error) {
    console.error(`Error loading or validating schema from ${schemaPath}:`);
    console.error(error.message);
    process.exit(1);
  }
}

// Use the function
const validatedSchema = loadAndValidateSchema(
  "./config/production-schema.json"
);
```

## Best Practices

1. **Platform-Specific Libraries**: Always use the correct crypt_shared library for your platform and validate it using `validateCryptSharedLib`.

2. **Key Security**: In production, use secure key management services instead of local keys stored on disk.

3. **Key File Permissions**: If you must use local key files, restrict file permissions to only the necessary users or processes.

4. **Schema Validation**: Always validate your schemas before using them with MongoDB CSFLE to catch errors early.

5. **Schema Version Control**: Keep your schema files under version control to track changes over time.

6. **Error Handling**: Implement proper error handling for all utility functions, especially in production environments.

7. **Key Rotation**: Implement a key rotation policy and use the utility functions to help manage the rotation process.
