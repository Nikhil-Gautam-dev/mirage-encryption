# MongoDB Crypt Shared Library Guide

The MongoDB crypt_shared library is an essential component required for MongoDB Client-Side Field Level Encryption (CSFLE). This guide provides detailed instructions for downloading, installing, and configuring this library for use with the mirage-encryption package.

## Table of Contents

- [Overview](#overview)
- [Downloading the Crypt Shared Library](#downloading-the-crypt-shared-library)
  - [Platform-Specific Libraries](#platform-specific-libraries)
  - [Version Compatibility](#version-compatibility)
- [Installation](#installation)
  - [Windows Installation](#windows-installation)
  - [macOS Installation](#macos-installation)
  - [Linux Installation](#linux-installation)
- [Configuration](#configuration)
  - [Directory Structure](#directory-structure)
  - [Path Resolution](#path-resolution)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

## Overview

The crypt_shared library provides the core cryptographic operations required for MongoDB CSFLE. It's a platform-specific binary that must be present in your application environment for encryption and decryption operations to work properly.

The mirage-encryption package uses this library through the MongoDB drivers but requires you to provide the correct path to the library for your platform.

## Downloading the Crypt Shared Library

### Platform-Specific Libraries

The library is available as part of the MongoDB Enterprise Server package but can be downloaded separately for each platform:

| Platform | File Name            | Architecture                   |
| -------- | -------------------- | ------------------------------ |
| Windows  | mongo_crypt_v1.dll   | x86_64 (64-bit)                |
| macOS    | mongo_crypt_v1.dylib | Intel x86_64 or Apple M1/ARM64 |
| Linux    | mongo_crypt_v1.so    | x86_64 (64-bit)                |

### Version Compatibility

The library version should match your MongoDB server version for optimal compatibility. As a general rule:

- MongoDB 6.0: Use crypt_shared v6.x
- MongoDB 5.0: Use crypt_shared v5.x
- MongoDB 4.4: Use crypt_shared v4.4.x
- MongoDB 4.2: Use crypt_shared v4.2.x

### Download Steps

Follow these steps to download the MongoDB crypt_shared library:

1. Visit the [MongoDB Download Center](https://www.mongodb.com/try/download/enterprise)

2. Select your MongoDB version from the dropdown menu

   - Choose the version that matches your MongoDB server version
   - Note: Enterprise version is not required, as we will be using library for CSFLE

3. Select your platform and architecture

   - Windows: Choose Windows x64 for 64-bit systems
   - macOS: Choose macOS x64 for Intel Macs or ARM64 for Apple Silicon
   - Linux: Choose the appropriate distribution and architecture

4. In the Package dropdown, select "crypt_shared"

   - This option specifically downloads only the encryption library without the full MongoDB server

5. Click the Download button

After downloading the archive file, extract it and locate the `mongo_crypt_v1.dll` (Windows), `mongo_crypt_v1.dylib` (macOS), or `mongo_crypt_v1.so` (Linux) in the `lib` directory of the extracted folder.

The exact location may vary depending on your platform:

- Windows: `<extracted-folder>/lib/mongo_crypt_v1.dll`
- macOS: `<extracted-folder>/lib/mongo_crypt_v1.dylib`
- Linux: `<extracted-folder>/lib/mongo_crypt_v1.so`

## Installation

After downloading the crypt_shared package, follow these steps to install it in your application:

### Windows Installation

1. Extract the downloaded ZIP file

2. Navigate to the `lib` directory within the extracted folder
3. Locate the `mongo_crypt_v1.dll` file
4. Copy this file to your application's library directory (e.g., `./lib/mongo_crypt_v1.dll`)

### macOS Installation

1. Extract the downloaded TGZ file:

   ```bash
   tar -xvzf mongo_crypt_shared_v1-macos-[VERSION].tgz
   ```

2. Navigate to the `lib` directory within the extracted folder
3. Locate the `mongo_crypt_v1.dylib` file
4. Copy this file to your application's library directory (e.g., `./lib/mongo_crypt_v1.dylib`)

### Linux Installation

1. Extract the downloaded TGZ file:

   ```bash
   tar -xvzf mongo_crypt_shared_v1-linux-x86_64-[DISTRIBUTION]-[VERSION].tgz
   ```

2. Navigate to the `lib` directory within the extracted folder
3. Locate the `mongo_crypt_v1.so` file
4. Copy this file to your application's library directory (e.g., `./lib/mongo_crypt_v1.so`)

## Configuration

### Directory Structure

It's recommended to place the crypt_shared library in a dedicated directory within your project. The mirage-encryption package is configured to look for the library in a `config` directory by default, but you can specify a custom path if needed.

Recommended project structure:

```
my-project/
├── config/                    # Default location recognized by mirage-encryption
│   ├── mongo_crypt_v1.dll     # Windows
│   ├── mongo_crypt_v1.dylib   # macOS
│   └── mongo_crypt_v1.so      # Linux
├── src/
├── node_modules/
├── package.json
└── ...
```

Example of the extraction and installation process:

```
# Downloaded and extracted structure
mongo_crypt_shared_v1-[platform]-[version]/
├── lib/
│   ├── mongo_crypt_v1.[dll|dylib|so]  # The file you need
└── ... (other files)

# Copy the file to your project
my-project/
├── config/
│   └── mongo_crypt_v1.[dll|dylib|so]  # Copied from the extracted folder
└── ...
```

### Path Resolution

In your application, use path resolution to ensure the library can be found regardless of the working directory:

```typescript
import path from "path";
import os from "os";

// Determine the correct path based on platform
let cryptSharedPath;
switch (os.platform()) {
  case "win32":
    cryptSharedPath = path.resolve(__dirname, "./lib/mongo_crypt_v1.dll");
    break;
  case "darwin":
    cryptSharedPath = path.resolve(__dirname, "./lib/mongo_crypt_v1.dylib");
    break;
  case "linux":
    cryptSharedPath = path.resolve(__dirname, "./lib/mongo_crypt_v1.so");
    break;
  default:
    throw new Error(`Unsupported platform: ${os.platform()}`);
}
```

## Validation

The mirage-encryption package includes a utility function to validate the crypt_shared library:

```typescript
import { validateCryptSharedLib } from "mirage-encryption";

try {
  // This validates that the file exists and is the correct format for your platform
  validateCryptSharedLib(cryptSharedPath);
  console.log("Crypt shared library is valid");
} catch (error) {
  console.error("Invalid crypt shared library:", error.message);
  process.exit(1);
}
```

This validation checks:

1. That the file exists
2. That it has the correct file extension for the platform
3. That the file header matches the expected format for a shared library

## Troubleshooting

### Common Issues

1. **Library Not Found**

   Error message: `crypt_shared library not found at: [PATH]`

   Solution: Verify that the file exists at the specified path and that your application has read permissions for the file.

2. **Incorrect Library Version**

   Error message: `Cannot load crypt_shared library: incompatible version`

   Solution: Download the crypt_shared library that matches your MongoDB server version.

3. **Wrong Platform Library**

   Error message: `Invalid crypt_shared library extension for current platform`

   Solution: Ensure you're using the correct library for your platform (.dll for Windows, .dylib for macOS, .so for Linux).

4. **Permission Issues**

   Error message: `Error loading crypt_shared library: permission denied`

   Solution: Check file permissions and ensure your application has read and execute permissions for the library file.

5. **Missing Dependencies**

   Error message: `Error loading crypt_shared library: missing dependencies`

   Solution: On Linux, install any missing dependencies using your package manager:

   ```bash
   # For Ubuntu/Debian
   apt-get install libssl-dev libcurl4

   # For RHEL/CentOS
   yum install openssl-devel libcurl-devel
   ```

### Platform-Specific Notes

- **Windows**: Ensure that the directory containing the DLL is in the system PATH or is in the same directory as your executable.
- **macOS**: If using Apple Silicon (M1/M2), you might need to use Rosetta 2 compatibility layer if the library is x86_64 only.
- **Linux**: Ensure you have the correct version for your distribution. Some distributions might require specific packages as dependencies.

## CI/CD Integration

When integrating with CI/CD pipelines, you need to ensure the crypt_shared library is available in your build environment.

### GitHub Actions Example

```yaml
name: Build and Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Download MongoDB crypt_shared library
        run: |
          mkdir -p lib
          wget -q https://downloads.mongodb.org/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7.tgz
          tar -xzf mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7.tgz
          cp mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7/lib/mongo_crypt_v1.so lib/

      - name: Run tests
        run: npm test
```

### Docker Integration

If using Docker, include the crypt_shared library in your Docker image:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Download and extract crypt_shared library
RUN apk add --no-cache wget tar \
    && mkdir -p lib \
    && wget -q https://downloads.mongodb.org/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7.tgz \
    && tar -xzf mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7.tgz \
    && cp mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7/lib/mongo_crypt_v1.so lib/ \
    && rm -rf mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.7*

COPY . .

CMD ["node", "src/index.js"]
```
