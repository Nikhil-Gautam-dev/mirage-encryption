# Error Handling

The mirage-encryption package provides specialized error classes to help with error handling and debugging in your application.

## Table of Contents

- [Overview](#overview)
- [Error Classes](#error-classes)
  - [ConfigurationError](#configurationerror)
  - [ValidationError](#validationerror)
  - [EncryptionError](#encryptionerror)
  - [KMSError](#kmserror)
- [Use Cases](#use-cases)
  - [Handling Configuration Issues](#handling-configuration-issues)
  - [Handling Validation Issues](#handling-validation-issues)
  - [Handling Encryption Issues](#handling-encryption-issues)
  - [Comprehensive Error Handling](#comprehensive-error-handling)
  - [Custom Error Handling](#custom-error-handling)
- [Best Practices](#best-practices)

## Overview

The mirage-encryption package throws specialized error types for different categories of issues. These error types inherit from JavaScript's native `Error` class and provide additional context to help identify and resolve problems.

## Error Classes

### ConfigurationError

Thrown when there's an issue with the configuration of the encryption service, KMS provider, or MongoDB client.

**When it's thrown:**

- Invalid MongoDB URI
- Missing or invalid KMS provider configuration
- Issues with key vault configuration
- Problems initializing the MongoDB client with encryption

**Example:**

```typescript
throw new ConfigurationError("Invalid MongoDB URI");
```

### ValidationError

Thrown when there's an issue with validation of inputs, schemas, or files.

**When it's thrown:**

- Schema validation failures
- Invalid file paths
- Invalid or missing parameters
- Format issues with encryption schemas

**Example:**

```typescript
throw new ValidationError("Schema file does not exist at path: " + filePath);
```

### EncryptionError

Thrown when there's an issue with the encryption or decryption operations.

**When it's thrown:**

- Problems creating or retrieving Data Encryption Keys (DEKs)
- Issues generating encryption schemas
- Errors during MongoDB encryption operations

**Example:**

```typescript
throw new EncryptionError(
  `Failed to create or retrieve DEK for ${fieldKeyAltName}: ${error.message}`
);
```

### KMSError

Thrown when there are issues related to Key Management Service (KMS) operations.

**When it's thrown:**

- Invalid KMS provider type
- Authentication issues with KMS providers
- Problems with master keys
- Key creation or retrieval issues

**Example:**

```typescript
throw new KMSError(`Unsupported KMS provider: ${provider.type}`);
```

## Use Cases

### Handling Configuration Issues

```typescript
import { ServerEncryptionService, ConfigurationError } from "mirage-encryption";
import path from "path";

try {
  // Attempt to create encryption service with potentially invalid config
  const encryptionService = new ServerEncryptionService(
    "mongodb://localhost:27017",
    kmsProvider,
    keyVault,
    path.resolve("./lib/mongo_crypt_v1.dll")
  );

  await encryptionService.initializeWithFile("./schema.json");
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error("Configuration error:", error.message);

    // Handle specific configuration issues
    if (error.message.includes("MongoDB URI")) {
      console.error("Please check your MongoDB connection string");
    } else if (error.message.includes("KMS provider")) {
      console.error("Please check your KMS provider configuration");
    }

    // Exit or use fallback configuration
  } else {
    // Handle other errors
    console.error("Unknown error:", error);
  }
}
```

### Handling Validation Issues

```typescript
import { ServerEncryptionService, ValidationError } from "mirage-encryption";
import path from "path";

try {
  const encryptionService = new ServerEncryptionService(
    "mongodb://localhost:27017",
    kmsProvider,
    keyVault,
    path.resolve("./lib/mongo_crypt_v1.dll")
  );

  // Attempt to initialize with potentially invalid schema file
  await encryptionService.initializeWithFile("./schema.json");
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);

    // Handle specific validation issues
    if (error.message.includes("Schema file")) {
      console.error(
        "Please check that your schema file exists and is accessible"
      );
    } else if (error.message.includes("Schema validation")) {
      console.error("Please check your schema format");
    }

    // Use a default schema or exit
  } else {
    // Handle other errors
    console.error("Unknown error:", error);
  }
}
```

### Handling Encryption Issues

```typescript
import {
  DekManager,
  EncryptionSchemaService,
  EncryptionError,
} from "mirage-encryption";
import { MongoClient } from "mongodb";

async function generateSchema() {
  const client = new MongoClient("mongodb://localhost:27017");
  const dekManager = new DekManager(
    client,
    "encryption._keys_",
    keyVault,
    kmsProvider
  );
  const schemaService = new EncryptionSchemaService(dekManager);

  try {
    // Attempt to generate schema
    return await schemaService.generateCSFLESchema("./schema.json");
  } catch (error) {
    if (error instanceof EncryptionError) {
      console.error("Encryption error:", error.message);

      // Log detailed information for debugging
      console.error("Failed to generate encryption schema");
      console.error(
        "Please check your DEK configuration and MongoDB connection"
      );

      // Return a basic schema or rethrow
      throw error;
    } else {
      // Handle other errors
      console.error("Unknown error:", error);
      throw error;
    }
  }
}
```

### Comprehensive Error Handling

```typescript
import {
  ServerEncryptionService,
  ConfigurationError,
  ValidationError,
  EncryptionError,
  KMSError,
} from "mirage-encryption";
import path from "path";
import fs from "fs";

async function setupEncryption() {
  try {
    // Check if crypt_shared library exists
    const cryptSharedPath = path.resolve("./lib/mongo_crypt_v1.dll");
    if (!fs.existsSync(cryptSharedPath)) {
      throw new ValidationError(
        `Crypt shared library not found at: ${cryptSharedPath}`
      );
    }

    // Create encryption service
    const encryptionService = new ServerEncryptionService(
      "mongodb://localhost:27017",
      kmsProvider,
      keyVault,
      cryptSharedPath
    );

    // Check if schema file exists
    const schemaPath = path.resolve("./schema.json");
    if (!fs.existsSync(schemaPath)) {
      throw new ValidationError(`Schema file not found at: ${schemaPath}`);
    }

    // Initialize with schema
    await encryptionService.initializeWithFile(schemaPath);

    return encryptionService.getMongoClient();
  } catch (error) {
    // Handle specific error types
    if (error instanceof ConfigurationError) {
      console.error("Configuration error:", error.message);
      // Handle configuration issues
    } else if (error instanceof ValidationError) {
      console.error("Validation error:", error.message);
      // Handle validation issues
    } else if (error instanceof EncryptionError) {
      console.error("Encryption error:", error.message);
      // Handle encryption issues
    } else if (error instanceof KMSError) {
      console.error("KMS error:", error.message);
      // Handle KMS issues
    } else {
      console.error("Unknown error:", error);
    }

    // Rethrow or return null
    return null;
  }
}
```

### Custom Error Handling

You can extend the built-in error types for more specific error handling:

```typescript
import { ValidationError, EncryptionError } from "mirage-encryption";

// Create custom error types
class SchemaFormatError extends ValidationError {
  constructor(message: string) {
    super(`Schema format error: ${message}`);
    this.name = "SchemaFormatError";
  }
}

class KeyVaultAccessError extends EncryptionError {
  constructor(message: string) {
    super(`Key vault access error: ${message}`);
    this.name = "KeyVaultAccessError";
  }
}

// Use custom error types
function validateSchema(schema: any) {
  if (!schema) {
    throw new SchemaFormatError("Schema cannot be null or undefined");
  }

  if (!schema.properties) {
    throw new SchemaFormatError("Schema must have 'properties' field");
  }

  // Additional validation
}

async function accessKeyVault(client: any, namespace: string) {
  try {
    // Attempt to access key vault
    const [db, collection] = namespace.split(".");
    return client.db(db).collection(collection);
  } catch (error) {
    throw new KeyVaultAccessError(
      `Failed to access key vault: ${error.message}`
    );
  }
}
```

## Best Practices

1. **Specific Error Handling**: Catch and handle each error type separately to provide specific handling for different issues.

2. **Descriptive Error Messages**: Always provide detailed error messages that explain what went wrong and how to fix it.

3. **Logging**: Log errors with appropriate severity levels and include contextual information for debugging.

4. **Fallback Mechanisms**: Implement fallback mechanisms for non-critical errors to improve resilience.

5. **Error Propagation**: Consider whether to handle errors locally or propagate them up the call stack based on your application's architecture.

6. **Documentation**: Document the potential errors that each function can throw and how to handle them.

7. **Monitoring**: In production, monitor and alert on specific error types to identify recurring issues.

8. **Testing**: Write tests that specifically check error handling code paths to ensure they work correctly.
