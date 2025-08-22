# EncryptionSchemaService

The `EncryptionSchemaService` class in mirage-encryption provides utilities for generating MongoDB Client-Side Field Level Encryption (CSFLE) schemas from simplified schema definitions.

## Table of Contents

- [Overview](#overview)
- [Constructor](#constructor)
- [Methods](#methods)
- [Use Cases](#use-cases)
  - [Basic Schema Generation](#basic-schema-generation)
  - [Schema Customization](#schema-customization)
  - [Complex Schema Generation](#complex-schema-generation)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

`EncryptionSchemaService` automates the process of converting a simplified schema definition into the complex format required by MongoDB's CSFLE. It handles the creation of Data Encryption Keys (DEKs) for each field and applies appropriate encryption algorithms based on field types.

## Constructor

```typescript
constructor(dekManager: DekManager)
```

**Parameters:**

- `dekManager` (DekManager): An instance of the `DekManager` class to handle Data Encryption Key operations

## Methods

### generateCSFLESchema

Generates a MongoDB CSFLE schema from a simplified schema definition file.

```typescript
public async generateCSFLESchema(schemaFilePath: string): Promise<IEncryptionSchema>
```

**Parameters:**

- `schemaFilePath` (string): Path to the schema definition file

**Returns:**

- `Promise<IEncryptionSchema>`: The fully formed CSFLE schema ready for use with MongoDB

**Throws:**

- `ValidationError`: If the schema file is invalid or cannot be parsed
- `EncryptionError`: If there's an error generating the schema or creating DEKs

## Use Cases

### Basic Schema Generation

The most common use case is generating a schema from a JSON file:

```typescript
import { MongoClient } from "mongodb";
import { DekManager, EncryptionSchemaService } from "mirage-encryption";
import path from "path";

// Create MongoDB client
const client = new MongoClient("mongodb://localhost:27017");

// Configure key vault and KMS provider
const keyVault = { database: "encryption", collection: "_keys_" };
const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;
const kmsProvider = {
  type: "local",
  local: { key: generateLocalKey() },
};

// Create DEK manager
const dekManager = new DekManager(
  client,
  keyVaultNamespace,
  keyVault,
  kmsProvider
);

// Create schema service
const schemaService = new EncryptionSchemaService(dekManager);

async function generateSchema() {
  try {
    // Generate schema from file
    const schema = await schemaService.generateCSFLESchema(
      path.resolve("./schema.json")
    );

    console.log("Generated schema:", JSON.stringify(schema, null, 2));
    return schema;
  } catch (error) {
    console.error("Failed to generate schema:", error);
  }
}

// Call the function
generateSchema().catch(console.error);
```

### Schema Customization

You can customize the schema generation by creating a custom schema loader:

```typescript
import { ServerEncryptionService } from "mirage-encryption";
import fs from "fs";

// Custom schema loader function
function customSchemaLoader(filePath: string) {
  // Read the schema file
  const schemaContent = fs.readFileSync(filePath, "utf-8");

  // Parse the schema
  const parsedSchema = JSON.parse(schemaContent);

  // Apply custom transformations or validations
  // ...

  return parsedSchema;
}

// Use the custom schema loader
const encryptionService = new ServerEncryptionService(/* ... */);
await encryptionService.initializeWithFile("./schema.json", customSchemaLoader);
```

### Complex Schema Generation

For more complex scenarios, you might want to generate schemas programmatically:

```typescript
import {
  DekManager,
  EncryptionSchemaService,
  ServerEncryptionService,
} from "mirage-encryption";
import { MongoClient } from "mongodb";

async function setupEncryption() {
  // Create MongoDB client
  const client = new MongoClient("mongodb://localhost:27017");

  // Configure key vault and KMS provider
  const keyVault = { database: "encryption", collection: "_keys_" };
  const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;
  const kmsProvider = {
    type: "local",
    local: { key: generateLocalKey() },
  };

  // Create DEK manager
  const dekManager = new DekManager(
    client,
    keyVaultNamespace,
    keyVault,
    kmsProvider
  );

  // Create schema service
  const schemaService = new EncryptionSchemaService(dekManager);

  // Generate schema for multiple applications
  const apps = ["crm", "billing", "support"];
  const schemas = {};

  for (const app of apps) {
    const schemaPath = `./schemas/${app}-schema.json`;
    schemas[app] = await schemaService.generateCSFLESchema(schemaPath);
  }

  // Create encryption services for each application
  const cryptSharedPath = "./lib/mongo_crypt_v1.dll";
  const encryptionServices = {};

  for (const app of apps) {
    const encryptionService = new ServerEncryptionService(
      "mongodb://localhost:27017",
      kmsProvider,
      keyVault,
      cryptSharedPath
    );

    encryptionService.initializeWithSchema(schemas[app]);
    encryptionServices[app] = encryptionService;
  }

  return encryptionServices;
}
```

## Error Handling

The `generateCSFLESchema` method may throw various errors:

```typescript
import {
  EncryptionSchemaService,
  ValidationError,
  EncryptionError,
} from "mirage-encryption";

try {
  const schema = await schemaService.generateCSFLESchema("./schema.json");
  // Use the generated schema
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Schema validation error:", error.message);
    // Handle schema validation errors
  } else if (error instanceof EncryptionError) {
    console.error("Encryption error:", error.message);
    // Handle encryption-specific errors
  } else {
    console.error("Unexpected error:", error);
    // Handle other errors
  }
}
```

## Best Practices

1. **Schema Versioning**: Keep your schema files under version control and use a versioning scheme to track changes.

2. **Schema Validation**: Validate your schemas before deploying to production to catch errors early.

3. **Algorithm Selection**: Be intentional about choosing between deterministic and random encryption algorithms based on your query needs.

4. **Field Selection**: Only encrypt the fields that contain sensitive data to minimize performance impact.

5. **Schema Testing**: Create a test suite that validates your schemas against sample documents to ensure proper encryption.

6. **Schema Documentation**: Document your schema structure and which fields are encrypted for future reference.

7. **Schema Backup**: Maintain backups of your schema definitions as they are critical for accessing encrypted data.

8. **Schema Evolution**: Plan for schema evolution and have a strategy for handling changes to encryption requirements over time.
