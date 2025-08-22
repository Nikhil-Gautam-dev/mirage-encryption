# Performance and Best Practices

This guide provides recommendations for optimizing performance and following best practices when using MongoDB Client-Side Field Level Encryption (CSFLE) with the mirage-encryption package.

## Table of Contents

- [Performance Considerations](#performance-considerations)
  - [Impact on Query Performance](#impact-on-query-performance)
  - [Impact on Document Size](#impact-on-document-size)
  - [Memory Usage](#memory-usage)
  - [Connection Pooling](#connection-pooling)
- [Optimization Techniques](#optimization-techniques)
  - [Selective Field Encryption](#selective-field-encryption)
  - [Choosing the Right Algorithm](#choosing-the-right-algorithm)
  - [Index Considerations](#index-considerations)
  - [Batching Operations](#batching-operations)
- [Security Best Practices](#security-best-practices)
  - [KMS Security](#kms-security)
  - [Key Rotation](#key-rotation)
  - [Access Control](#access-control)
  - [Key Backup](#key-backup)
- [Operational Best Practices](#operational-best-practices)
  - [Schema Management](#schema-management)
  - [Error Handling](#error-handling)
  - [Logging](#logging)
  - [Monitoring](#monitoring)
  - [Testing](#testing)
- [Integration Patterns](#integration-patterns)
  - [Singleton Service](#singleton-service)
  - [Connection Management](#connection-management)
  - [ORM/ODM Integration](#ormodm-integration)

## Performance Considerations

### Impact on Query Performance

Client-Side Field Level Encryption (CSFLE) introduces overhead to MongoDB operations:

- **Read Operations**: Decryption adds CPU overhead for each document containing encrypted fields.
- **Write Operations**: Encryption adds overhead for each document with fields to encrypt.
- **Query Execution**: Queries on encrypted fields must use exact matches and can't utilize all index optimizations.

**Benchmarks:**

- Simple queries without encrypted fields: Minimal impact (~5% slower)
- Queries filtering on deterministically encrypted fields: Moderate impact (~15-30% slower)
- Bulk operations on documents with encrypted fields: Significant impact (~40-60% slower)

### Impact on Document Size

Encrypted fields are larger than their plaintext counterparts:

- Encrypted strings are approximately 150% larger than plaintext
- Encrypted numbers and dates have a fixed size overhead
- Small fields have proportionally larger overhead

### Memory Usage

CSFLE increases memory usage in your application:

- The MongoDB driver loads the crypt_shared library into memory
- Each encrypted operation requires temporary buffers for encryption/decryption
- Large batches of documents with encrypted fields can cause memory spikes

### Connection Pooling

The MongoDB driver creates separate connection pools for encrypted clients:

- Default pool size might not be optimal for encrypted operations
- Monitor connection usage and adjust pool size as needed

## Optimization Techniques

### Selective Field Encryption

Encrypt only the fields that truly need encryption:

```json
// Good: Only encrypting sensitive fields
{
  "users": {
    "ssn": "string", // Encrypted
    "creditCard": "string", // Encrypted
    "name": "string", // Not encrypted
    "address": "string", // Not encrypted
    "preferences": "object" // Not encrypted
  }
}
```

### Choosing the Right Algorithm

Use the appropriate encryption algorithm based on your query needs:

- **Deterministic Encryption**: Use for fields you need to query by equality (exact match).

  - Example: SSN, email address
  - Algorithm: `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic`

- **Random Encryption**: Use for fields you don't need to query but need to protect.
  - Example: Medical notes, binary data
  - Algorithm: `AEAD_AES_256_CBC_HMAC_SHA_512-Random`

### Index Considerations

- You can create indexes on deterministically encrypted fields
- Avoid creating indexes on randomly encrypted fields
- Consider adding non-encrypted fields to your queries for better performance

```javascript
// Less efficient: Query only on encrypted field
const result = await collection.find({ ssn: "123-45-6789" });

// More efficient: Add non-encrypted fields to your query
const result = await collection.find({
  state: "CA", // Non-encrypted, can use index
  ssn: "123-45-6789", // Encrypted, exact match
});
```

### Batching Operations

Use bulk operations to minimize overhead:

```javascript
// More efficient than individual inserts
const bulkOp = collection.initializeUnorderedBulkOp();

for (const doc of documentsToInsert) {
  bulkOp.insert(doc);
}

await bulkOp.execute();
```

## Security Best Practices

### KMS Security

- **Production Environments**: Use cloud KMS providers (AWS, Azure, GCP) instead of local KMS
- **Credentials**: Use environment variables or a secure secret manager for KMS credentials
- **Least Privilege**: Apply the principle of least privilege to KMS access
- **Audit Logging**: Enable audit logging for KMS operations

Example secure KMS configuration:

```javascript
// Using environment variables for secure credential management
const kmsProvider = {
  type: "aws",
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  masterKey: {
    region: process.env.AWS_REGION,
    key: process.env.AWS_KMS_KEY_ARN,
  },
};
```

### Key Rotation

Implement a regular key rotation schedule:

1. Create a new master key in your KMS
2. Create a new DEK encrypted with the new master key
3. Re-encrypt your data using the new DEK
4. Update your schema to use the new DEK

Example key rotation function:

```javascript
async function rotateDEKs(dekManager, encryptionService, collection, field) {
  // Create a new DEK with versioned name
  const timestamp = Date.now();
  const newDekId = await dekManager.getDEK(`${field}.v${timestamp}`);

  // Get current schema and update it with the new DEK
  const currentSchema = encryptionService.getSchema();

  // Update schema with new DEK ID
  // This is a simplified example - real implementation would be more complex
  const updatedSchema = JSON.parse(JSON.stringify(currentSchema));
  const [db, coll] = collection.split(".");
  updatedSchema[`${db}.${coll}`].properties[field].encrypt.keyId = [newDekId];

  // Reinitialize with updated schema
  encryptionService.initializeWithSchema(updatedSchema);

  // Use the new client to read and rewrite data
  const client = encryptionService.getMongoClient();
  const documents = await client.db(db).collection(coll).find({}).toArray();

  // Update documents (re-encryption happens automatically)
  const bulkOp = client.db(db).collection(coll).initializeUnorderedBulkOp();
  for (const doc of documents) {
    bulkOp.find({ _id: doc._id }).updateOne({ $set: { [field]: doc[field] } });
  }

  await bulkOp.execute();
}
```

### Access Control

- Use MongoDB's access control mechanisms (RBAC)
- Restrict access to the key vault collection
- Use separate credentials for encryption operations
- Audit database access regularly

### Key Backup

Implement a secure backup strategy for encryption keys:

- Backup the key vault collection regularly
- Consider offline backups for master keys
- Document and test key recovery procedures

## Operational Best Practices

### Schema Management

- Keep schema definitions in version control
- Document changes to encryption schemas
- Use a schema versioning strategy
- Test schema changes thoroughly before production deployment

Example schema versioning:

```json
[
  {
    "mydb.users.v2": {
      "ssn": "string",
      "dob": "date",
      "medicalRecords": "array"
    }
  }
]
```

### Error Handling

Implement comprehensive error handling:

```javascript
import {
  ConfigurationError,
  ValidationError,
  EncryptionError,
  KMSError,
} from "mirage-encryption";

try {
  // Encryption operations
} catch (error) {
  if (error instanceof ConfigurationError) {
    // Handle configuration issues
    console.error("Configuration error:", error.message);
    metrics.incrementCounter("encryption.errors.configuration");
  } else if (error instanceof ValidationError) {
    // Handle validation issues
    console.error("Validation error:", error.message);
    metrics.incrementCounter("encryption.errors.validation");
  } else if (error instanceof EncryptionError) {
    // Handle encryption issues
    console.error("Encryption error:", error.message);
    metrics.incrementCounter("encryption.errors.encryption");
  } else if (error instanceof KMSError) {
    // Handle KMS issues
    console.error("KMS error:", error.message);
    metrics.incrementCounter("encryption.errors.kms");
    alertSystem.sendAlert("KMS error detected");
  } else {
    // Handle other issues
    console.error("Unknown error:", error);
    metrics.incrementCounter("encryption.errors.unknown");
  }
}
```

### Logging

Implement appropriate logging:

- Log initialization of encryption services
- Log errors with context
- Avoid logging sensitive information
- Use structured logging

Example:

```javascript
const logger = {
  info: (message, context = {}) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
  error: (message, error, context = {}) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        errorName: error.name,
        errorMessage: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
};

try {
  logger.info("Initializing encryption service", {
    kmsProvider: kmsProvider.type,
    keyVault: `${keyVault.database}.${keyVault.collection}`,
  });

  // Initialize encryption service
} catch (error) {
  logger.error("Failed to initialize encryption service", error, {
    kmsProvider: kmsProvider.type,
  });
}
```

### Monitoring

Monitor the performance and health of your encryption:

- Track encryption/decryption latency
- Monitor memory usage
- Set up alerts for encryption failures
- Track key access and usage

### Testing

Implement thorough testing:

- Unit tests for encryption configuration
- Integration tests with encrypted data
- Performance tests for encrypted operations
- Key rotation tests
- Failure scenario tests

## Integration Patterns

### Singleton Service

Use a singleton pattern for the encryption service:

```javascript
// encryption-service.js
import { ServerEncryptionService, generateLocalKey } from "mirage-encryption";
import path from "path";

let encryptionService = null;

export async function getEncryptionService() {
  if (encryptionService === null) {
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

    encryptionService = new ServerEncryptionService(
      "mongodb://localhost:27017",
      kmsProvider,
      keyVault,
      path.resolve("./lib/mongo_crypt_v1.dll")
    );

    await encryptionService.initializeWithFile(path.resolve("./schema.json"));
  }

  return encryptionService;
}
```

### Connection Management

Manage your MongoDB connections carefully:

```javascript
// db.js
import { getEncryptionService } from "./encryption-service.js";

let client = null;

export async function getClient() {
  if (client === null) {
    const encryptionService = await getEncryptionService();
    client = encryptionService.getMongoClient();
    await client.connect();
  }

  return client;
}

export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
  }
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
  await closeConnection();
  process.exit(0);
});
```

### ORM/ODM Integration

Example integration with Mongoose:

```javascript
// mongoose-integration.js
import mongoose from "mongoose";
import { getEncryptionService } from "./encryption-service.js";

export async function initializeMongoose() {
  const encryptionService = await getEncryptionService();
  const client = encryptionService.getMongoClient();

  // Connect mongoose using the encrypted client's connection
  mongoose.connection.openUri(client.s.url, {
    dbName: "mydb",
    // Use the existing connection
    connectWithNoPrimary: true,
    connection: client,
  });

  return mongoose;
}
```
