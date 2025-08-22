# Encryption Schema Guide

This guide explains how to define, validate, and work with encryption schemas in the mirage-encryption package.

## Table of Contents

- [Overview](#overview)
- [Schema Structure](#schema-structure)
  - [Simple Schema Format](#simple-schema-format)
  - [Complete Schema Format](#complete-schema-format)
  - [Supported Data Types](#supported-data-types)
- [Schema File vs. Direct Schema](#schema-file-vs-direct-schema)
- [Encryption Algorithms](#encryption-algorithms)
- [Working with Schemas](#working-with-schemas)
  - [Loading Schema from File](#loading-schema-from-file)
  - [Programmatic Schema Generation](#programmatic-schema-generation)
  - [Schema Validation](#schema-validation)
- [Use Cases](#use-cases)
  - [Basic Field Encryption](#basic-field-encryption)
  - [Nested Object Encryption](#nested-object-encryption)
  - [Array Field Encryption](#array-field-encryption)
  - [Multiple Collections](#multiple-collections)
- [Best Practices](#best-practices)

## Overview

Encryption schemas define which fields in your MongoDB collections should be encrypted and how. The mirage-encryption package provides tools to create, validate, and apply these schemas for MongoDB Client-Side Field Level Encryption (CSFLE).

## Schema Structure

### Simple Schema Format

For ease of use, mirage-encryption accepts a simplified schema format in JSON:

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

This simplified format specifies the field paths and data types without having to define the detailed encryption configuration.

### Complete Schema Format

The complete schema format that MongoDB CSFLE expects is more complex and is generated automatically:

```typescript
{
  "database.collection": {
    bsonType: "object",
    properties: {
      field1: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [/* Binary key IDs */]
        }
      },
      field2: {
        encrypt: {
          bsonType: "int",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
          keyId: [/* Binary key IDs */]
        }
      },
      nestedObject: {
        bsonType: "object",
        properties: {
          nestedField: {
            encrypt: {
              bsonType: "string",
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
              keyId: [/* Binary key IDs */]
            }
          }
        }
      }
    }
  }
}
```

### Supported Data Types

The following BSON types are supported for encryption:

| Schema Type | BSON Type  |
| ----------- | ---------- |
| "double"    | Double     |
| "string"    | String     |
| "object"    | Object     |
| "array"     | Array      |
| "binData"   | Binary     |
| "objectId"  | ObjectId   |
| "bool"      | Boolean    |
| "date"      | Date       |
| "int"       | Int32      |
| "long"      | Int64      |
| "decimal"   | Decimal128 |

## Schema File vs. Direct Schema

There are two ways to provide encryption schemas:

1. **Schema File**: Create a JSON file with the simplified schema format and load it using `initializeWithFile()`
2. **Direct Schema**: Create the complete schema object directly in your code and use it with `initializeWithSchema()`

### Schema File Approach

```typescript
import { ServerEncryptionService } from "mirage-encryption";
import path from "path";

// Create encryption service
const encryptionService = new ServerEncryptionService(/* config */);

// Initialize with schema file
await encryptionService.initializeWithFile(path.resolve("./schema.json"));
```

### Direct Schema Approach

```typescript
import { ServerEncryptionService } from "mirage-encryption";
import { Binary } from "mongodb";

// Create encryption service
const encryptionService = new ServerEncryptionService(/* config */);

// Create schema directly
const schema = {
  "mydb.users": {
    bsonType: "object",
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [new Binary(/* ... */)],
        },
      },
    },
  },
};

// Initialize with direct schema
encryptionService.initializeWithSchema(schema);
```

## Encryption Algorithms

MongoDB CSFLE supports two encryption algorithms:

1. **AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic**:

   - Always produces the same ciphertext for the same plaintext
   - Enables equality queries on encrypted fields
   - Less secure for fields with limited possible values
   - Best for fields like SSN, tax ID, etc.
   - **Important**: Only supports a limited set of data types:
     - `string`
     - `int`
     - `long`
     - `date`
     - `objectId`
     - `uuid`
   - Other types like `array`, `object`, `binData`, `bool`, etc. must use Random encryption

2. **AEAD_AES_256_CBC_HMAC_SHA_512-Random**:
   - Produces different ciphertext each time, even for the same plaintext
   - More secure, but doesn't support equality queries
   - Best for fields with sensitive content that doesn't need to be queried (medical records, notes, etc.)
   - Supports all BSON data types

## Working with Schemas

### Loading Schema from File

Create a JSON file with your simplified schema:

```json
[
  {
    "patients.records": {
      "ssn": "string",
      "bloodType": "string",
      "dob": "date",
      "insurance": {
        "policyNumber": "string",
        "groupNumber": "string"
      }
    }
  }
]
```

Then load it in your application:

```typescript
import { ServerEncryptionService } from "mirage-encryption";
import path from "path";

const encryptionService = new ServerEncryptionService(/* config */);
await encryptionService.initializeWithFile(path.resolve("./schema.json"));
```

### Programmatic Schema Generation

You can use `EncryptionSchemaService` to programmatically generate schemas:

```typescript
import {
  DekManager,
  EncryptionSchemaService,
  MongoClient,
} from "mirage-encryption";

// Create a MongoDB client
const client = new MongoClient("mongodb://localhost:27017");

// Set up DEK Manager
const keyVault = { database: "encryption", collection: "_keys_" };
const keyVaultNamespace = `${keyVault.database}.${keyVault.collection}`;
const dekManager = new DekManager(
  client,
  keyVaultNamespace,
  keyVault,
  kmsProvider
);

// Create Schema Service
const schemaService = new EncryptionSchemaService(dekManager);

// Generate schema from a file
const schema = await schemaService.generateCSFLESchema("./schema.json");

// Now you can use this schema with ServerEncryptionService
encryptionService.initializeWithSchema(schema);
```

### Schema Validation

The package provides a utility function to validate schemas:

```typescript
import { validateCSFLESchema } from "mirage-encryption";

try {
  // Validate a schema
  validateCSFLESchema(mySchema);
  console.log("Schema is valid");
} catch (error) {
  console.error("Schema validation failed:", error.message);
}
```

## Use Cases

### Basic Field Encryption

Encrypting simple fields like SSN or credit card numbers:

```json
[
  {
    "payments.customers": {
      "ssn": "string",
      "creditCardNumber": "string",
      "dob": "date"
    }
  }
]
```

### Nested Object Encryption

Encrypting fields within nested objects:

```json
[
  {
    "users.profiles": {
      "name": "string",
      "contact": {
        "email": "string",
        "phone": "string",
        "address": {
          "street": "string",
          "city": "string",
          "zip": "string"
        }
      }
    }
  }
]
```

### Array Field Encryption

Encrypting array fields:

```json
[
  {
    "patients.records": {
      "medicalHistory": "array",
      "medications": "array"
    }
  }
]
```

### Multiple Collections

Encrypting fields across multiple collections:

```json
[
  {
    "hr.employees": {
      "ssn": "string",
      "salary": "int"
    }
  },
  {
    "hr.dependents": {
      "ssn": "string",
      "relationship": "string"
    }
  }
]
```

## Best Practices

1. **Minimize Encrypted Fields**: Only encrypt fields that contain sensitive data to minimize performance impact.

2. **Choose the Right Algorithm**: Use deterministic encryption only when you need to query on the encrypted field and ensure the field type is supported (string, int, long, date, objectId, or uuid).

3. **Data Type Compatibility**: Be aware of data type restrictions for deterministic encryption. Complex types like arrays, objects, and binary data must use random encryption.

4. **Version Control**: Keep your schema files in version control and document changes.

5. **Backup Schemas**: Always back up your encryption schemas as they're critical for decrypting your data.

6. **Testing**: Thoroughly test your schema changes before deploying to production.

7. **Field Selection**: Consider encrypting entire objects when most of their fields contain sensitive data.

8. **Schema Evolution**: Plan for schema evolution and have a strategy for handling schema changes.

9. **Documentation**: Document which fields are encrypted and which algorithms are used for each field.
