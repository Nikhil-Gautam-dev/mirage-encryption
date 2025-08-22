# Mirage Encryption

An utility encryption package for implementing MongoDB Client-Side Field Level Encryption (CSFLE).

[![npm version](https://img.shields.io/npm/v/mirage-encryption.svg)](https://www.npmjs.com/package/mirage-encryption)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- Simplified MongoDB CSFLE integration for Node.js applications
- Support for multiple KMS providers (Local, AWS, Azure, GCP)
- Automated Data Encryption Key (DEK) management
- Schema-based encryption configuration
- Cross-platform support (Windows, macOS, Linux)

## Documentation

Detailed documentation for all features is available in the docs directory:

- [Getting Started Guide](./docs/Getting-Started.md) - Quick start guide for new users
- [ServerEncryptionService](./docs/ServerEncryptionService.md) - Core encryption service documentation
- [KMS Providers](./docs/KMS-Providers.md) - Key Management Service provider details
- [Encryption Schema](./docs/Encryption-Schema.md) - Schema definition and management
- [DekManager](./docs/DekManager.md) - Data Encryption Key management
- [EncryptionSchemaService](./docs/EncryptionSchemaService.md) - Schema generation and handling
- [Utility Functions](./docs/Utility-Functions.md) - Helper functions reference
- [Error Handling](./docs/Error-Handling.md) - Error types and handling strategies
- [Performance & Best Practices](./docs/Performance-Best-Practices.md) - Optimization tips and recommendations
- [Testing Guide](./docs/Testing-Guide.md) - Instructions for running and writing tests

## Prerequisites

- Node.js v16 or newer
- MongoDB v6.0 or newer
- MongoDB crypt_shared library (platform-specific)

## Installation

```bash
npm install mirage-encryption
```

## Getting Started

### Basic Usage

```typescript
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

// Configure KMS provider (using local KMS in this example)
const kmsProvider = {
  type: "local",
  local: {
    key: generateLocalKey(), // Generates or loads a key from local-master-key.txt
  },
};

// Configure key vault details (where MongoDB stores the encryption keys)
const keyVault = {
  database: "encryption",
  collection: "_keys_",
};

// Create encryption service
const encryptionService = new ServerEncryptionService(
  "mongodb://localhost:27017", // MongoDB URI
  kmsProvider,
  keyVault,
  path.resolve("./path/to/mongo_crypt_v1.dll") // Path to crypt_shared library
);

// Initialize with schema file
await encryptionService.initializeWithFile(
  path.resolve("./path/to/schema.json")
);

// Get the MongoDB client with encryption enabled
const client = encryptionService.getMongoClient();

// Use the client as usual
const db = client.db("mydb");
const collection = db.collection("mycollection");

// Data is automatically encrypted/decrypted
await collection.insertOne({
  name: "John Doe",
  ssn: "123-45-6789", // Will be encrypted if specified in schema
});
```

### Schema Definition

To specify which fields should be encrypted, create a schema file like this:

```json
[
  {
    "mydb.mycollection": {
      "ssn": "string",
      "creditCard": "string",
      "dob": "date",
      "medicalRecords": "array",
      "contact": {
        "email": "string",
        "phone": "string"
      }
    }
  }
]
```

This schema will encrypt `ssn`, `creditCard`, `dob`, `medicalRecords`, and the nested `email` and `phone` fields.

### Supported KMS Providers

#### Local KMS

```typescript
const kmsProvider = {
  type: "local",
  local: {
    key: generateLocalKey(),
  },
};
```

#### AWS KMS

```typescript
const kmsProvider = {
  type: "aws",
  aws: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
    sessionToken: "YOUR_SESSION_TOKEN", // Optional
  },
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    endpoint: "kms.us-east-1.amazonaws.com", // Optional
  },
};
```

#### Azure Key Vault

```typescript
const kmsProvider = {
  type: "azure",
  azure: {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    tenantId: "YOUR_TENANT_ID",
  },
  masterKey: {
    keyVaultEndpoint: "https://your-key-vault.vault.azure.net/",
    keyName: "YOUR_KEY_NAME",
    keyVersion: "YOUR_KEY_VERSION", // Optional
  },
};
```

#### Google Cloud KMS

```typescript
const kmsProvider = {
  type: "gcp",
  gcp: {
    email: "your-service-account@project.iam.gserviceaccount.com",
    privateKey: "YOUR_PRIVATE_KEY",
  },
  masterKey: {
    projectId: "your-project",
    location: "global",
    keyRing: "your-key-ring",
    keyName: "your-key-name",
    keyVersion: "1", // Optional
    endpoint: "cloudkms.googleapis.com", // Optional
  },
};
```

## Advanced Usage

### Using EncryptionSchemaService

You can programmatically generate encryption schemas:

```typescript
import {
  DekManager,
  EncryptionSchemaService,
  MongoClient,
} from "mirage-encryption";

const client = new MongoClient("mongodb://localhost:27017");
const keyVault = { database: "encryption", collection: "_keys_" };
const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;

const dekManager = new DekManager(
  client,
  keyVaultNamespace,
  keyVault,
  kmsProvider
);

const schemaService = new EncryptionSchemaService(dekManager);

// Generate schema from file
const schema = await schemaService.generateCSFLESchema("./path/to/schema.json");

// Initialize encryption service with the generated schema
encryptionService.initializeWithSchema(schema);
```

### Direct Schema Initialization

You can also create and provide the schema directly:

```typescript
const schema = {
  "mydb.mycollection": {
    bsonType: "object",
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [
            /* Binary key IDs */
          ],
        },
      },
      // Other encrypted fields...
    },
  },
};

encryptionService.initializeWithSchema(schema);
```

## Crypt Shared Library

You need to download the platform-specific MongoDB crypt_shared library:

- Windows: `mongo_crypt_v1.dll`
- macOS: `mongo_crypt_v1.dylib`
- Linux: `mongo_crypt_v1.so`

For detailed instructions on downloading, installing, and configuring the crypt_shared library, refer to our [Crypt Shared Library Guide](./docs/Crypt-Shared-Library.md).

## API Reference

### Classes

#### `ServerEncryptionService`

Main class for setting up MongoDB client-side field level encryption.

```typescript
constructor(
  mongoUri: string,
  kmsProvider: IKMSProvider,
  keyVault: IKeyVault,
  cryptSharedFilePath: string,
  options?: MongoClientOptions
)
```

**Methods**:

- `initializeWithFile(schemaFilePath: string): Promise<void>`
- `initializeWithSchema(schema: IEncryptionSchema): void`
- `getMongoClient(): MongoClient`
- `getSchema(): IEncryptionSchema`

#### `DekManager`

Handles Data Encryption Key (DEK) management.

```typescript
constructor(
  mongoClient: MongoClient,
  keyVaultNamespace: string,
  keyVault: IKeyVault,
  kmsProvider: IKMSProvider
)
```

**Methods**:

- `getDEK(fieldKeyAltName: string): Promise<Binary>`

#### `EncryptionSchemaService`

Creates encryption schemas for MongoDB CSFLE.

```typescript
constructor(dekManager: DekManager)
```

**Methods**:

- `generateCSFLESchema(schemaFilePath: string): Promise<IEncryptionSchema>`

### Utility Functions

- `generateLocalKey(filePath?: string): string` - Generates or loads a local master key
- `fileExists(filePath: string): boolean` - Checks if a file exists
- `validateCryptSharedLib(libPath: string): string` - Validates the crypt_shared library
- `validateCSFLESchema(schema: any): boolean` - Validates CSFLE schema structure

## Error Handling

The package provides several error types:

- `ConfigurationError` - Configuration issues
- `ValidationError` - Schema or input validation failures
- `EncryptionError` - Encryption operation failures
- `KMSError` - Key Management Service issues

Example:

```typescript
import { ConfigurationError, ValidationError } from "mirage-encryption";

try {
  // Encryption operations
} catch (error) {
  if (error instanceof ConfigurationError) {
    // Handle configuration issues
  } else if (error instanceof ValidationError) {
    // Handle validation failures
  } else {
    // Handle other errors
  }
}
```

## Examples

### Basic Example with Local KMS

```typescript
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

async function main() {
  // Configuration
  const mongoUri = "mongodb://localhost:27017";
  const kmsProvider = {
    type: "local",
    local: {
      key: generateLocalKey(),
    },
  };
  const keyVault = {
    database: "encryption",
    collection: "_keys_",
  };
  const cryptSharedPath = path.resolve("./path/to/mongo_crypt_v1.dll");

  // Initialize encryption service
  const encryptionService = new ServerEncryptionService(
    mongoUri,
    kmsProvider,
    keyVault,
    cryptSharedPath
  );

  // Initialize with schema
  await encryptionService.initializeWithFile(path.resolve("./schema.json"));

  // Get MongoDB client
  const client = encryptionService.getMongoClient();

  // Connect and use
  await client.connect();

  // Use client as normal - encryption/decryption is automatic
  const db = client.db("mydb");
  const collection = db.collection("users");

  // Insert data with fields that will be automatically encrypted
  const result = await collection.insertOne({
    name: "John Doe",
    ssn: "123-45-6789", // Will be encrypted
    email: "john@example.com", // Will be encrypted if specified in schema
  });

  console.log(`Inserted document with ID: ${result.insertedId}`);

  // Query - automatic decryption happens when reading
  const user = await collection.findOne({ name: "John Doe" });
  console.log(user);

  await client.close();
}

main().catch(console.error);
```

## License

ISC

## Authors

- Rishabh Maheshwari
- Nikhil Gautam

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
