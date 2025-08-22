# mirage-encryption Documentation

Welcome to the mirage-encryption documentation. This package provides simplified MongoDB Client-Side Field Level Encryption (CSFLE) for Node.js applications.

## Documentation Index

### Getting Started

- [Getting Started Guide](./Getting-Started.md) - Complete walkthrough for new users

### Core Components

- [ServerEncryptionService](./ServerEncryptionService.md) - Main encryption service class
- [DekManager](./DekManager.md) - Data Encryption Key management
- [EncryptionSchemaService](./EncryptionSchemaService.md) - Schema generation and handling

### Configuration and Setup

- [KMS Providers](./KMS-Providers.md) - Configure Key Management Service providers
- [Encryption Schema](./Encryption-Schema.md) - Define what fields to encrypt and how
- [Crypt Shared Library](./Crypt-Shared-Library.md) - Download and configure the required crypt_shared library

### References

- [Utility Functions](./Utility-Functions.md) - Helper functions for common tasks
- [Error Handling](./Error-Handling.md) - Error types and handling strategies

### Best Practices

- [Performance & Best Practices](./Performance-Best-Practices.md) - Optimization and security recommendations

### Development

- [Testing Guide](./Testing-Guide.md) - Instructions for running and writing tests

## Quick Links

### Installation

```bash
npm install mirage-encryption
```

### Basic Usage Example

```typescript
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

async function main() {
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

  // Use the client as usual - encryption/decryption is automatic
  const db = client.db("mydb");
  const collection = db.collection("users");

  await collection.insertOne({
    name: "John Doe",
    ssn: "123-45-6789", // Will be encrypted if specified in schema
  });
}

main().catch(console.error);
```
