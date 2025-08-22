# Getting Started with mirage-encryption

This guide will help you get started with mirage-encryption to implement MongoDB Client-Side Field Level Encryption (CSFLE) in your Node.js application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
  - [Step 1: Install Required Dependencies](#step-1-install-required-dependencies)
  - [Step 2: Download MongoDB Crypt Shared Library](#step-2-download-mongodb-crypt-shared-library)
  - [Step 3: Create a Schema File](#step-3-create-a-schema-file)
  - [Step 4: Set Up Encryption Service](#step-4-set-up-encryption-service)
  - [Step 5: Use the Encrypted MongoDB Client](#step-5-use-the-encrypted-mongodb-client)
- [Advanced Configuration](#advanced-configuration)
  - [Using Cloud KMS Providers](#using-cloud-kms-providers)
  - [Custom MongoDB Options](#custom-mongodb-options)
  - [Direct Schema Initialization](#direct-schema-initialization)
- [Common Issues](#common-issues)
- [Next Steps](#next-steps)

## Prerequisites

Before you start, make sure you have:

- Node.js v16 or newer installed
- MongoDB v6.0 or newer running and accessible
- Basic understanding of MongoDB and its Node.js driver

## Installation

Install the package using npm:

```bash
npm install mirage-encryption
```

## Basic Setup

### Step 1: Install Required Dependencies

Install MongoDB and the client encryption packages:

```bash
npm install mongodb mongodb-client-encryption
```

### Step 2: Download MongoDB Crypt Shared Library

Download the appropriate crypt_shared library for your platform from the [MongoDB Download Center](https://www.mongodb.com/try/download/enterprise):

- Windows: `mongo_crypt_v1.dll`
- macOS: `mongo_crypt_v1.dylib`
- Linux: `mongo_crypt_v1.so`

Place the library in a directory accessible to your application. For this example, we'll use `./lib/`.

For detailed instructions on downloading, installing, and configuring the crypt_shared library, refer to our [Crypt Shared Library Guide](./Crypt-Shared-Library.md).

### Step 3: Create a Schema File

Create a schema file that defines which fields should be encrypted. Save this as `schema.json`:

```json
[
  {
    "mydb.users": {
      "ssn": "string",
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

This schema specifies that the `ssn`, `dob`, `medicalRecords`, and nested `contact.email` and `contact.phone` fields should be encrypted in the `users` collection of the `mydb` database.

### Step 4: Set Up Encryption Service

Create a file called `encryption-setup.js` to set up the encryption service:

```javascript
const {
  ServerEncryptionService,
  generateLocalKey,
} = require("mirage-encryption");
const path = require("path");
const os = require("os");

// Determine the correct crypt_shared library path based on platform
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

// Configure KMS provider (using local KMS for simplicity)
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

// Create and initialize the encryption service
async function initializeEncryption() {
  // Create encryption service
  const encryptionService = new ServerEncryptionService(
    "mongodb://localhost:27017",
    kmsProvider,
    keyVault,
    cryptSharedPath
  );

  // Initialize with schema file
  await encryptionService.initializeWithFile(path.resolve("./schema.json"));

  return encryptionService;
}

module.exports = { initializeEncryption };
```

### Step 5: Use the Encrypted MongoDB Client

Create a file called `app.js` to use the encrypted MongoDB client:

```javascript
const { initializeEncryption } = require("./encryption-setup");

async function main() {
  try {
    // Initialize encryption
    const encryptionService = await initializeEncryption();

    // Get the MongoDB client with encryption enabled
    const client = encryptionService.getMongoClient();

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB with encryption enabled");

    // Get a reference to the database and collection
    const db = client.db("mydb");
    const usersCollection = db.collection("users");

    // Insert a document with fields that will be automatically encrypted
    const result = await usersCollection.insertOne({
      name: "John Doe",
      ssn: "123-45-6789", // Will be encrypted
      dob: new Date("1980-01-01"), // Will be encrypted
      medicalRecords: ["Allergies: None", "Blood Type: O+"], // Will be encrypted
      contact: {
        email: "john@example.com", // Will be encrypted
        phone: "555-123-4567", // Will be encrypted
      },
    });

    console.log(`Inserted document with ID: ${result.insertedId}`);

    // Find the document (fields will be automatically decrypted)
    const user = await usersCollection.findOne({ name: "John Doe" });
    console.log("Retrieved user:");
    console.log(JSON.stringify(user, null, 2));

    // Close the connection
    await client.close();
    console.log("Connection closed");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main().catch(console.error);
```

Run the application:

```bash
node app.js
```

## Advanced Configuration

### Using Cloud KMS Providers

For production environments, you should use a cloud KMS provider instead of the local KMS provider.

#### AWS KMS Example:

```javascript
const kmsProvider = {
  type: "aws",
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
  },
};
```

#### Azure Key Vault Example:

```javascript
const kmsProvider = {
  type: "azure",
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
  },
  masterKey: {
    keyVaultEndpoint: "https://your-key-vault.vault.azure.net/",
    keyName: "your-key-name",
  },
};
```

### Custom MongoDB Options

You can provide custom MongoDB client options:

```javascript
const mongoOptions = {
  connectTimeoutMS: 5000,
  socketTimeoutMS: 60000,
  maxPoolSize: 50,
  retryWrites: true,
};

const encryptionService = new ServerEncryptionService(
  "mongodb://localhost:27017",
  kmsProvider,
  keyVault,
  cryptSharedPath,
  mongoOptions
);
```

### Direct Schema Initialization

Instead of loading a schema from a file, you can create and initialize it directly:

```javascript
const { Binary } = require("mongodb");

// Generate a key ID (you would typically get this from your key vault)
const keyId = new Binary(Buffer.from("..."), 4);

// Create schema directly
const schema = {
  "mydb.users": {
    bsonType: "object",
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [keyId],
        },
      },
      dob: {
        encrypt: {
          bsonType: "date",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
          keyId: [keyId],
        },
      },
      // Other encrypted fields...
    },
  },
};

// Initialize with direct schema
encryptionService.initializeWithSchema(schema);
```

## Common Issues

1. **Missing Crypt Shared Library**: If you get an error about the crypt_shared library, make sure you've downloaded the correct version for your platform and the path is correct.

2. **Connection Issues**: If you have trouble connecting to MongoDB, check your connection string and ensure MongoDB is running.

3. **Schema Issues**: If your schema isn't working correctly, make sure it follows the correct format and the database and collection names match exactly.

4. **Key Vault Access**: If you get errors related to the key vault, ensure the MongoDB user has the necessary permissions to access the key vault collection.

5. **Memory Issues**: CSFLE can be memory-intensive. If you encounter memory issues, consider adjusting your Node.js memory limits or optimizing your encryption schema.

## Next Steps

Now that you have a basic setup working, you might want to explore:

- Setting up encryption in a production environment with a cloud KMS provider
- Implementing more complex schema structures
- Setting up automatic key rotation
- Integrating with an ORM or ODM
- Implementing error handling and monitoring

For more detailed information, refer to the following documentation:

- [ServerEncryptionService Documentation](./ServerEncryptionService.md)
- [Encryption Schema Guide](./Encryption-Schema.md)
- [KMS Providers Documentation](./KMS-Providers.md)
- [Error Handling Guide](./Error-Handling.md)
