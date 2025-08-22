# ServerEncryptionService

`ServerEncryptionService` is the primary class for implementing MongoDB Client-Side Field Level Encryption (CSFLE) in your application.

## Table of Contents

- [Overview](#overview)
- [Constructor](#constructor)
- [Methods](#methods)
- [Use Cases](#use-cases)
  - [Basic Setup](#basic-setup)
  - [Schema File Initialization](#schema-file-initialization)
  - [Direct Schema Initialization](#direct-schema-initialization)
  - [Custom MongoDB Options](#custom-mongodb-options)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

`ServerEncryptionService` provides a simplified interface to configure and manage MongoDB CSFLE. It handles the complexity of setting up encryption and provides methods to initialize encryption with schema files or direct schema objects.

## Constructor

```typescript
constructor(
  mongoUri: string,
  kmsProvider: IKMSProvider,
  keyVault: IKeyVault,
  cryptSharedFilePath: TCryptSharedFilePath,
  options?: MongoClientOptions
)
```

**Parameters:**

- `mongoUri` (string): MongoDB connection URI
- `kmsProvider` (IKMSProvider): Key Management Service configuration
- `keyVault` (IKeyVault): Configuration for the MongoDB collection that stores encryption keys
- `cryptSharedFilePath` (TCryptSharedFilePath): Path to MongoDB's crypt_shared library
- `options` (MongoClientOptions, optional): Additional MongoDB client options

**Throws:**

- `ConfigurationError`: If any configuration parameter is invalid

## Methods

### initializeWithFile

Initializes the encryption service using a schema file.

```typescript
public async initializeWithFile(
  schemaFilePath: TSchemaFilePath,
  schemaLoader?: (file: string) => IEncryptionSchema
): Promise<void>
```

**Parameters:**

- `schemaFilePath` (TSchemaFilePath): Path to the schema file
- `schemaLoader` (function, optional): Custom function to load and parse the schema file

**Throws:**

- `ValidationError`: If the schema file path is invalid
- `ConfigurationError`: If schema loading or initialization fails

### initializeWithSchema

Initializes the service using a schema object.

```typescript
public initializeWithSchema(schema: IEncryptionSchema): void
```

**Parameters:**

- `schema` (IEncryptionSchema): Encryption schema object

**Throws:**

- `ValidationError`: If the schema is invalid
- `ConfigurationError`: If initialization fails

### getMongoClient

Gets the initialized MongoDB client with encryption enabled.

```typescript
public getMongoClient(): MongoClient
```

**Returns:**

- `MongoClient`: MongoDB client with encryption enabled

**Throws:**

- `ConfigurationError`: If the client is not initialized

### getSchema

Gets the encryption schema.

```typescript
public getSchema(): IEncryptionSchema
```

**Returns:**

- `IEncryptionSchema`: The current encryption schema

**Throws:**

- `ConfigurationError`: If the schema is not initialized

## Use Cases

### Basic Setup

```typescript
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

// Configure KMS provider (using local KMS in this example)
const kmsProvider = {
  type: "local",
  local: {
    key: generateLocalKey(),
  },
};

// Configure key vault details
const keyVault = {
  database: "encryption",
  collection: "_keys_",
};

// Create encryption service
const encryptionService = new ServerEncryptionService(
  "mongodb://localhost:27017",
  kmsProvider,
  keyVault,
  path.resolve("./lib/mongo_crypt_v1.dll")
);

// Initialize with schema file
await encryptionService.initializeWithFile(path.resolve("./schema.json"));

// Get the MongoDB client with encryption enabled
const client = encryptionService.getMongoClient();

// Use the client as usual
const db = client.db("mydb");
const collection = db.collection("users");
await collection.insertOne({ name: "John", ssn: "123-45-6789" });
```

### Schema File Initialization

The schema file should be in the following format:

```json
[
  {
    "database.collection": {
      "field1": "string",
      "field2": "int",
      "nestedObject": {
        "nestedField": "string"
      }
    }
  }
]
```

Example implementation:

```typescript
// Initialize with schema file
await encryptionService.initializeWithFile(path.resolve("./schema.json"));
```

### Direct Schema Initialization

For more control, you can create and provide the schema directly:

```typescript
import { Binary } from "mongodb";

// Create encryption schema directly
const schema = {
  "mydb.users": {
    bsonType: "object",
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [new Binary(Buffer.from("..."), 4)], // Binary key ID
        },
      },
      medicalRecords: {
        encrypt: {
          bsonType: "array",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
          keyId: [new Binary(Buffer.from("..."), 4)], // Binary key ID
        },
      },
    },
  },
};

// Initialize with direct schema
encryptionService.initializeWithSchema(schema);
```

### Custom MongoDB Options

You can provide additional MongoDB client options:

```typescript
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

const mongoOptions = {
  connectTimeoutMS: 5000,
  socketTimeoutMS: 60000,
  maxPoolSize: 50,
  retryWrites: true,
  retryReads: true,
};

// Create encryption service with custom MongoDB options
const encryptionService = new ServerEncryptionService(
  "mongodb://localhost:27017",
  kmsProvider,
  keyVault,
  path.resolve("./lib/mongo_crypt_v1.dll"),
  mongoOptions
);

await encryptionService.initializeWithFile(path.resolve("./schema.json"));
```

## Error Handling

The `ServerEncryptionService` class may throw the following errors:

- `ConfigurationError`: For issues with MongoDB URI, KMS providers, or other configuration problems
- `ValidationError`: For schema validation failures or invalid file paths
- `EncryptionError`: For encryption operation failures

Example error handling:

```typescript
import {
  ServerEncryptionService,
  generateLocalKey,
  ConfigurationError,
  ValidationError,
  EncryptionError,
} from "mirage-encryption";
import path from "path";

try {
  const encryptionService = new ServerEncryptionService(
    "mongodb://localhost:27017",
    kmsProvider,
    keyVault,
    path.resolve("./lib/mongo_crypt_v1.dll")
  );

  await encryptionService.initializeWithFile(path.resolve("./schema.json"));

  const client = encryptionService.getMongoClient();
  // Continue with database operations
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error("Configuration error:", error.message);
    // Handle configuration issues
  } else if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
    // Handle schema validation issues
  } else if (error instanceof EncryptionError) {
    console.error("Encryption error:", error.message);
    // Handle encryption operation issues
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Best Practices

1. **Initialize Early**: Initialize the encryption service during your application startup to ensure all database operations are properly encrypted.

2. **Secure Key Management**: For production environments, avoid using local KMS providers. Instead, use cloud providers like AWS KMS, Azure Key Vault, or Google Cloud KMS.

3. **Schema Management**: Keep your schema definitions in version-controlled files, and validate them before deployment.

4. **Error Handling**: Implement proper error handling for all encryption operations to gracefully handle issues.

5. **Testing**: Create separate test environments with their own key vaults to avoid affecting production data.

6. **Connection Pooling**: Be aware that encrypted clients may have different performance characteristics. Adjust your MongoDB connection pool size accordingly.

7. **Monitoring**: Monitor the performance of encrypted operations, as they introduce additional overhead compared to non-encrypted operations.
