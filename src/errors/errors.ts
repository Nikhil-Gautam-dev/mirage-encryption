/**
 * Base error class for mirage-encryption errors
 */
export class MirageEncryptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MirageEncryptionError';
    }
}

/**
 * Error thrown when there's a configuration issue
 */
export class ConfigurationError extends MirageEncryptionError {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

/**
 * Error thrown when there's a validation issue
 */
export class ValidationError extends MirageEncryptionError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when there's an encryption operation issue
 */
export class EncryptionError extends MirageEncryptionError {
    constructor(message: string) {
        super(message);
        this.name = 'EncryptionError';
    }
}

/**
 * Error thrown when there's a schema-related issue
 */
export class SchemaError extends MirageEncryptionError {
    constructor(message: string) {
        super(message);
        this.name = 'SchemaError';
    }
}

/**
 * Error thrown when there's a KMS-related issue
 */
export class KMSError extends MirageEncryptionError {
    constructor(message: string) {
        super(message);
        this.name = 'KMSError';
    }
}
