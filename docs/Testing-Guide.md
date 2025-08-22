# Testing Guide

This guide provides instructions for running and writing tests for the mirage-encryption package.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
  - [Running All Tests](#running-all-tests)
  - [Running Specific Tests](#running-specific-tests)
  - [Running Tests in Watch Mode](#running-tests-in-watch-mode)
  - [Running Tests with Coverage](#running-tests-with-coverage)
- [Test Types](#test-types)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [Setting Up Test Environment](#setting-up-test-environment)
  - [MongoDB Requirements](#mongodb-requirements)
  - [Crypt Shared Library](#crypt-shared-library)
  - [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
  - [Unit Test Examples](#unit-test-examples)
  - [Integration Test Examples](#integration-test-examples)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before running the tests, make sure you have:

1. Node.js v16 or newer installed
2. MongoDB v6.0 or newer running locally on the default port (27017)
3. MongoDB crypt_shared library in the `config` directory:
   - Windows: `config/mongo_crypt_v1.dll`
   - macOS: `config/mongo_crypt_v1.dylib`
   - Linux: `config/mongo_crypt_v1.so`
4. Package dependencies installed: `npm install`

## Running Tests

### Running All Tests

To run all tests, use the following command:

```bash
npm test
```

This will execute all tests in the `test` directory using Jest.

### Running Specific Tests

To run specific tests, use the Jest CLI pattern matching:

```bash
# Run all tests in a specific file
npm test -- test/cryptShared.utils.test.ts
```

## Test Types

The mirage-encryption package contains two types of tests:

### Unit Tests

Located in the root of the `test` directory, unit tests check individual components and functions in isolation.

Main unit test files:

- `cryptShared.utils.test.ts`: Tests for the crypt shared library validation utilities
- `schema.utils.test.ts`: Tests for schema validation and manipulation utilities

### Integration Tests

Located in the `test/integration` directory, integration tests check how components work together and with MongoDB.

Main integration test files:

- `encryption.test.ts`: Tests for the full encryption/decryption workflow

## Setting Up Test Environment

### MongoDB Requirements

Tests require a MongoDB server running locally on the default port (27017). No authentication is needed for the tests.

To start MongoDB for testing:

```bash
# Using the MongoDB service
mongod --dbpath /path/to/data/directory

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Crypt Shared Library

The integration tests require the MongoDB crypt_shared library to be present in the `config` directory. You can download it from the [MongoDB Download Center](https://www.mongodb.com/try/download/enterprise).

Place the appropriate library for your platform in the `config` directory:

- Windows: `config/mongo_crypt_v1.dll`
- macOS: `config/mongo_crypt_v1.dylib`
- Linux: `config/mongo_crypt_v1.so`

### Test Configuration

The test configuration is managed by Jest through `jest.config.js`. The default configuration sets up:

- Node.js test environment
- TypeScript transformation with ts-jest

## Writing Tests

### Unit Test Examples

Here's an example of writing a unit test for utility functions:

```typescript
// Example test for a utility function
import { validateCSFLESchema } from "../src/utils/schema.utils";
import { ValidationError } from "../src/errors/errors";

describe("Schema Utilities", () => {
  it("should validate a valid schema", () => {
    const schema = {
      "db.collection": {
        bsonType: "object",
        properties: {
          field1: {
            encrypt: {
              bsonType: "string",
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
              keyId: [
                /* mock Binary */
              ],
            },
          },
        },
      },
    };

    expect(() => validateCSFLESchema(schema)).not.toThrow();
    expect(validateCSFLESchema(schema)).toBe(true);
  });

  it("should throw for invalid schema", () => {
    const invalidSchema = {
      "db.collection": {
        // Missing required fields
      },
    };

    expect(() => validateCSFLESchema(invalidSchema)).toThrow(ValidationError);
  });
});
```

### Integration Test Examples

Here's an example of writing an integration test:

```typescript
import { MongoClient } from "mongodb";
import { ServerEncryptionService, generateLocalKey } from "../src";
import { IKMSProvider } from "../src/types/kms";
import { IKeyVault } from "../src/types/schema";
import path from "path";
import fs from "fs";

describe("Encryption Integration", () => {
  const mongoURI = "mongodb://localhost:27017";
  const dbName = "test_db_" + Date.now(); // Use unique database name
  const collectionName = "test_collection";

  const keyVault: IKeyVault = {
    database: "encryption_test",
    collection: "_keys_",
  };

  const kmsProvider: IKMSProvider = {
    type: "local",
    local: {
      key: generateLocalKey(),
    },
  };

  let client: MongoClient;
  let schemaFilePath: string;

  beforeAll(() => {
    // Create temporary schema file
    schemaFilePath = path.resolve(`test_schema_${Date.now()}.json`);
    const schema = [
      {
        [`${dbName}.${collectionName}`]: {
          ssn: "string",
          age: "int",
        },
      },
    ];

    fs.writeFileSync(schemaFilePath, JSON.stringify(schema));
  });

  afterAll(async () => {
    // Clean up
    if (fs.existsSync(schemaFilePath)) {
      fs.unlinkSync(schemaFilePath);
    }

    if (client) {
      await client.db(dbName).dropDatabase();
      await client.db(keyVault.database).dropDatabase();
      await client.close();
    }
  });

  it("should encrypt and decrypt data correctly", async () => {
    const service = new ServerEncryptionService(
      mongoURI,
      kmsProvider,
      keyVault,
      path.resolve("config/mongo_crypt_v1.dll") // Use appropriate path for your platform
    );

    await service.initializeWithFile(schemaFilePath);
    client = service.getMongoClient();

    await client.connect();
    const collection = client.db(dbName).collection(collectionName);

    // Insert document with field to be encrypted
    const testDoc = { name: "John", ssn: "123-45-6789", age: 30 };
    const result = await collection.insertOne(testDoc);

    // Verify document was inserted
    expect(result.acknowledged).toBe(true);

    // Retrieve and verify decryption
    const savedDoc = await collection.findOne({ _id: result.insertedId });
    expect(savedDoc).toMatchObject(testDoc);
  });
});
```

## Troubleshooting

Common issues and solutions:

1. **MongoDB Connection Errors**:

   - Make sure MongoDB is running on the default port (27017)
   - Check if MongoDB requires authentication
   - Verify network connectivity to MongoDB

2. **Missing crypt_shared Library**:

   - Ensure the correct library for your platform is in the `config` directory
   - Check file permissions on the library file

3. **Test Timeouts**:

   - Increase the Jest timeout for long-running tests:
     ```typescript
     jest.setTimeout(30000); // Set timeout to 30 seconds
     ```

4. **Random Test Failures**:

   - Use unique database/collection names for each test run to prevent conflicts
   - Clean up resources properly in `afterEach`/`afterAll` blocks
   - Ensure MongoDB has enough disk space

5. **Schema Validation Errors**:
   - Double-check schema formats match expected CSFLE schema structure
   - Verify DEK generation is working correctly
