# KMS Providers

This document details the supported Key Management Service (KMS) providers in the mirage-encryption package and how to configure each one.

## Table of Contents

- [Overview](#overview)
- [Local KMS Provider](#local-kms-provider)
  - [Configuration](#local-configuration)
  - [Key Generation](#key-generation)
  - [Use Cases](#local-use-cases)
  - [Limitations](#local-limitations)
- [AWS KMS Provider](#aws-kms-provider)
  - [Configuration](#aws-configuration)
  - [Prerequisites](#aws-prerequisites)
  - [Use Cases](#aws-use-cases)
- [Azure Key Vault Provider](#azure-key-vault-provider)
  - [Configuration](#azure-configuration)
  - [Prerequisites](#azure-prerequisites)
  - [Use Cases](#azure-use-cases)
- [Google Cloud KMS Provider](#google-cloud-kms-provider)
  - [Configuration](#gcp-configuration)
  - [Prerequisites](#gcp-prerequisites)
  - [Use Cases](#gcp-use-cases)
- [Best Practices](#best-practices)

## Overview

The mirage-encryption package supports multiple Key Management Service (KMS) providers for securing your encryption keys. The choice of KMS provider depends on your security requirements, infrastructure, and compliance needs.

The KMS provider is responsible for securing the Customer Master Key (CMK), which is used to encrypt the Data Encryption Keys (DEKs) stored in the MongoDB key vault collection.

## Local KMS Provider

The Local KMS provider stores the master key locally on the application server. This is the simplest KMS option but provides the least security.

### Local Configuration

```typescript
import { generateLocalKey } from "mirage-encryption";

const kmsProvider = {
  type: "local",
  local: {
    key: generateLocalKey(), // Generates or loads a key from local-master-key.txt
  },
};
```

### Key Generation

The `generateLocalKey()` function creates a 96-byte random key encoded as a base64 string. By default, it saves this key to a file named `local-master-key.txt` in the current working directory.

You can specify a custom file path:

```typescript
const masterKey = generateLocalKey("/path/to/custom-key-file.txt");
```

If the file already exists, the function will read and return the key from that file instead of generating a new one.

### Local Use Cases

- **Development and Testing**: Local KMS is ideal for development and testing environments where security is less critical.
- **Proof of Concept**: When quickly demonstrating CSFLE functionality without setting up cloud KMS services.
- **Isolated Systems**: For systems with no internet connectivity that cannot access cloud KMS services.

### Local Limitations

- **Security Risk**: The master key is stored in plaintext on the local filesystem, making it vulnerable to unauthorized access.
- **No Key Rotation**: No built-in mechanism for key rotation or versioning.
- **No Audit Trail**: No logging or audit trail for key usage.

## AWS KMS Provider

AWS Key Management Service integrates with MongoDB CSFLE to provide secure key management.

### AWS Configuration

```typescript
const kmsProvider = {
  type: "aws",
  aws: {
    accessKeyId: "YOUR_AWS_ACCESS_KEY_ID",
    secretAccessKey: "YOUR_AWS_SECRET_ACCESS_KEY",
    sessionToken: "YOUR_AWS_SESSION_TOKEN", // Optional
  },
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    endpoint: "kms.us-east-1.amazonaws.com", // Optional, for VPC endpoints
  },
};
```

### AWS Prerequisites

1. Create an AWS KMS key in the AWS console or using the AWS CLI:

```bash
aws kms create-key --description "MongoDB CSFLE Master Key"
```

2. Grant permissions to your IAM user or role to use the KMS key:

```bash
aws kms create-grant --key-id YOUR_KMS_KEY_ID --grantee-principal YOUR_IAM_ROLE_ARN --operations Encrypt Decrypt
```

3. Configure your AWS credentials in your application.

### AWS Use Cases

- **Production Environments**: For secure key management in production systems.
- **Compliance Requirements**: When you need to meet compliance requirements like HIPAA, PCI DSS, or GDPR.
- **AWS Ecosystem**: When your application is already running in the AWS ecosystem.

## Azure Key Vault Provider

Azure Key Vault integrates with MongoDB CSFLE to provide secure key management.

### Azure Configuration

```typescript
const kmsProvider = {
  type: "azure",
  azure: {
    clientId: "YOUR_AZURE_CLIENT_ID",
    clientSecret: "YOUR_AZURE_CLIENT_SECRET",
    tenantId: "YOUR_AZURE_TENANT_ID",
  },
  masterKey: {
    keyVaultEndpoint: "https://your-key-vault.vault.azure.net/",
    keyName: "YOUR_KEY_NAME",
    keyVersion: "YOUR_KEY_VERSION", // Optional
  },
};
```

### Azure Prerequisites

1. Create an Azure Key Vault in the Azure portal.

2. Create a key in your Key Vault:

   - Navigate to your Key Vault in the Azure portal
   - Select "Keys" from the menu
   - Click "Generate/Import" and follow the instructions to create a new key

3. Register an application in Azure Active Directory:

   - Navigate to "App registrations" in Azure Active Directory
   - Create a new registration and note the Application (client) ID and Directory (tenant) ID
   - Create a client secret for the application

4. Grant your application permissions to access the key:
   - Navigate to your Key Vault
   - Select "Access policies"
   - Add a new policy granting your application "Get", "Unwrap Key", and "Wrap Key" permissions

### Azure Use Cases

- **Azure Cloud Environments**: For applications running in the Azure cloud.
- **Enterprise Environments**: Organizations that use Azure Active Directory for identity management.
- **Hybrid Cloud**: When your application spans both on-premises and Azure environments.

## Google Cloud KMS Provider

Google Cloud Key Management Service integrates with MongoDB CSFLE for secure key management.

### GCP Configuration

```typescript
const kmsProvider = {
  type: "gcp",
  gcp: {
    email: "your-service-account@project.iam.gserviceaccount.com",
    privateKey: "YOUR_SERVICE_ACCOUNT_PRIVATE_KEY",
  },
  masterKey: {
    projectId: "your-project-id",
    location: "global",
    keyRing: "your-key-ring",
    keyName: "your-key-name",
    keyVersion: "1", // Optional
    endpoint: "cloudkms.googleapis.com", // Optional
  },
};
```

### GCP Prerequisites

1. Create a Google Cloud project if you don't already have one.

2. Enable the Cloud KMS API:

```bash
gcloud services enable cloudkms.googleapis.com
```

3. Create a key ring and key:

```bash
# Create a key ring
gcloud kms keyrings create your-key-ring --location global

# Create a key
gcloud kms keys create your-key-name --location global --keyring your-key-ring --purpose encryption
```

4. Create a service account and grant it access to the key:

```bash
# Create service account
gcloud iam service-accounts create mongodb-encryption

# Get the service account email
export SA_EMAIL=$(gcloud iam service-accounts list --filter="name:mongodb-encryption" --format="value(email)")

# Grant the service account access to the key
gcloud kms keys add-iam-policy-binding your-key-name \
  --location global \
  --keyring your-key-ring \
  --member serviceAccount:$SA_EMAIL \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter
```

5. Create and download a service account key:

```bash
gcloud iam service-accounts keys create key-file.json --iam-account $SA_EMAIL
```

### GCP Use Cases

- **Google Cloud Environments**: For applications running in the Google Cloud.
- **Multi-Cloud Strategies**: Organizations implementing a multi-cloud strategy.
- **Compliance Requirements**: When you need to meet strict compliance requirements in Google Cloud environments.

## Best Practices

1. **Production Environments**: Use cloud KMS providers (AWS, Azure, GCP) for production environments instead of local KMS.

2. **Key Rotation**: Implement regular key rotation policies for your master keys.

3. **Least Privilege**: Grant the minimum necessary permissions to your service accounts or IAM roles.

4. **Secure Credential Storage**: Never hardcode credentials in your source code. Use environment variables, secret management services, or configuration files with appropriate access controls.

5. **Monitoring and Alerting**: Set up monitoring and alerting for KMS operations to detect unauthorized access attempts.

6. **Backup Strategy**: Ensure your key management strategy includes backup and recovery procedures to prevent data loss.

7. **Testing**: Test your key management configuration thoroughly, including key rotation and recovery scenarios.
