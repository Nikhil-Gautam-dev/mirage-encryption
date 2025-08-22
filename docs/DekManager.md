# DekManager

The `DekManager` class in mirage-encryption handles the creation and management of Data Encryption Keys (DEKs) used in MongoDB Client-Side Field Level Encryption (CSFLE).

## Table of Contents

- [Overview](#overview)
- [Constructor](#constructor)
- [Methods](#methods)
- [Use Cases](#use-cases)
  - [Basic DEK Management](#basic-dek-management)
  - [Custom Key Names](#custom-key-names)
  - [Integration with EncryptionSchemaService](#integration-with-encryptionschemaservice)
  - [DEK Rotation](#dek-rotation)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

`DekManager` is responsible for creating and retrieving Data Encryption Keys (DEKs) that are used to encrypt and decrypt data in MongoDB collections. These keys are stored in a special MongoDB collection called the key vault and are themselves encrypted using a Customer Master Key (CMK) from a KMS provider.

## Constructor

```typescript
constructor(
  mongoClient: MongoClient,
  keyVaultNamespace: string,
  keyVault: IKeyVault,
  kmsProvider: IKMSProvider
)
```

**Parameters:**

- `mongoClient` (MongoClient): A MongoDB client instance for connecting to the database
- `keyVaultNamespace` (string): The fully qualified namespace for the key vault (e.g., "encryption._keys_")
- `keyVault` (IKeyVault): Configuration object with database and collection names for the key vault
- `kmsProvider` (IKMSProvider): KMS provider configuration for encrypting DEKs

## Methods

### getDEK

Retrieves an existing DEK by alternate name or creates a new one if it doesn't exist.

```typescript
public async getDEK(fieldKeyAltName: string): Promise<Binary>
```

**Parameters:**

- `fieldKeyAltName` (string): The alternate name for the key, typically the field path (e.g., "users.ssn")

**Returns:**

- `Binary`: A MongoDB Binary representing the DEK ID

**Throws:**

- `EncryptionError`: If there's an issue retrieving or creating the DEK

## Use Cases

### Basic DEK Management

```typescript
import { MongoClient } from "mongodb";
import { DekManager } from "mirage-encryption";

// Create a MongoDB client
const client = new MongoClient("mongodb://localhost:27017");

// Configure key vault
const keyVault = { database: "encryption", collection: "_keys_" };
const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;

// Configure KMS provider
const kmsProvider = {
  type: "local",
  local: {
    key: generateLocalKey(),
  },
};

// Create DEK manager
const dekManager = new DekManager(
  client,
  keyVaultNamespace,
  keyVault,
  kmsProvider
);

async function getOrCreateDEK() {
  try {
    // Get or create a DEK for the "users.ssn" field
    const dekId = await dekManager.getDEK("users.ssn");
    console.log("DEK ID:", dekId);
    return dekId;
  } catch (error) {
    console.error("Failed to get or create DEK:", error);
  }
}
```

### Custom Key Names

You can use custom naming conventions for your DEKs:

```typescript
// Different naming strategies for DEKs
const userSSN_DEK = await dekManager.getDEK("app1.users.ssn.v1");
const userCreditCard_DEK = await dekManager.getDEK("app1.users.creditCard.v1");
const medicalRecords_DEK = await dekManager.getDEK(
  "app1.patients.medicalRecords.v1"
);
```

### Integration with EncryptionSchemaService

The `DekManager` is typically used with `EncryptionSchemaService` to automatically generate encryption schemas:

```typescript
import { DekManager, EncryptionSchemaService } from "mirage-encryption";
import { MongoClient } from "mongodb";

// Create MongoDB client and DEK manager
const client = new MongoClient("mongodb://localhost:27017");
const keyVault = { database: "encryption", collection: "_keys_" };
const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;
const dekManager = new DekManager(
  client,
  keyVaultNamespace,
  keyVault,
  kmsProvider
);

// Create schema service using DEK manager
const schemaService = new EncryptionSchemaService(dekManager);

// Generate schema from file
const schema = await schemaService.generateCSFLESchema("./schema.json");
```

### DEK Rotation

To rotate DEKs for specific fields:

```typescript
async function rotateDEK(fieldPath: string) {
  // Create a new DEK with a versioned alt name
  const timestamp = Date.now();
  const newDekId = await dekManager.getDEK(`${fieldPath}.v${timestamp}`);

  // Update your schema to use the new DEK
  // This would require updating the schema and re-initializing encryption

  return newDekId;
}

// Rotate the DEK for the SSN field
const newSsnDekId = await rotateDEK("users.ssn");
```

## Error Handling

The `getDEK` method may throw `EncryptionError` if it encounters issues:

```typescript
import { DekManager, EncryptionError } from "mirage-encryption";

try {
  const dekId = await dekManager.getDEK("users.ssn");
  // Use the DEK ID
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error("Encryption error:", error.message);
    // Handle encryption-specific errors
  } else {
    console.error("Unexpected error:", error);
    // Handle other errors
  }
}
```

## Best Practices

1. **Key Naming Convention**: Establish a consistent naming convention for your DEKs, possibly including the application name, collection name, field name, and version.

2. **Key Rotation**: Implement a regular key rotation policy to enhance security.

3. **Key Inventory**: Maintain an inventory of all DEKs used in your application, including which fields they encrypt.

4. **Connection Management**: The `DekManager` handles opening and closing the MongoDB connection internally. Be aware of this when managing connections in your application.

5. **Error Handling**: Implement comprehensive error handling for DEK operations, especially in production environments.

6. **Backup Strategy**: Ensure your key vault collection is included in your backup strategy. Without these keys, encrypted data cannot be decrypted.

7. **Access Control**: Limit access to the key vault collection to only the necessary service accounts or users.

8. **Monitoring**: Monitor DEK creation and usage for unusual patterns that might indicate security issues.
