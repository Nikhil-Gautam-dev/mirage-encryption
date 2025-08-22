import { validateCSFLESchema } from '../src/utils/schema.utils';
import { EEncryptionAlgorithm } from '../src/enums/enums';
import { IEncryptionSchema, TBsonType } from '../src/types/schema';

describe('schema.utils', () => {
    describe('validateCSFLESchema', () => {
        // Valid schemas test cases
        describe('Valid schemas', () => {
            it('should validate a basic schema with single encrypted field', () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };


                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with multiple encrypted fields', () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            username: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            email: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            age: {
                                encrypt: {
                                    bsonType: 'int' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with random algorithm encrypted fields', () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            sensitiveData: {
                                encrypt: {
                                    bsonType: 'array' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.RANDOM,
                                    keyId: []
                                }
                            },
                            profilePic: {
                                encrypt: {
                                    bsonType: 'binData' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.RANDOM,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with deeply nested properties', () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            profile: {
                                bsonType: 'object',
                                properties: {
                                    personalInfo: {
                                        bsonType: 'object',
                                        properties: {
                                            ssn: {
                                                encrypt: {
                                                    bsonType: 'string' as TBsonType,
                                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                                    keyId: []
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with additional properties', () => {
                const schema: IEncryptionSchema = {
                    "test.dynamic": {
                        bsonType: 'object',
                        properties: {
                            standard: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            dynamicField1: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            dynamicField2: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with all deterministic supported types', () => {
                const schema: IEncryptionSchema = {
                    "test.allTypes": {
                        bsonType: 'object',
                        properties: {
                            stringField: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            intField: {
                                encrypt: {
                                    bsonType: 'int' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            longField: {
                                encrypt: {
                                    bsonType: 'long' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            dateField: {
                                encrypt: {
                                    bsonType: 'date' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            objectIdField: {
                                encrypt: {
                                    bsonType: 'objectId' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            uuidField: {
                                encrypt: {
                                    bsonType: 'uuid' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it('should validate a schema with multiple collections', () => {
                const schema: IEncryptionSchema = {
                    "test.users": {
                        bsonType: 'object',
                        properties: {
                            username: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    },
                    "test.orders": {
                        bsonType: 'object',
                        properties: {
                            orderNumber: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });
        });

        describe("Invalid schemas", () => {
            it("should reject deterministic encryption with array type", () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: {
                                    bsonType: 'array' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema, "user")).toThrow(/not supported with Deterministic algorithm/);
            });

            it("should reject deterministic encryption with binData type", () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: {
                                    bsonType: 'binData' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema, "user")).toThrow(/not supported with Deterministic algorithm/);
            });

            it("should reject for empty properties", () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {}
                    }
                };

                expect(() => validateCSFLESchema(schema, "user")).toThrow("Invalid schema at 'user': 'properties' must not be empty.");
            });

            it("should reject null schema object", () => {
                const schema: any = {
                    "test.user": null
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/must be a non-null object/);
            });

            it("should reject non-object schema", () => {
                const schema: any = {
                    "test.user": "not an object"
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/must be a non-null object/);
            });

            it("should reject schema with missing bsonType in encrypt definition", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: {
                                    // missing bsonType
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/Missing bsonType for encrypted field/);
            });

            it("should reject schema with missing algorithm in encrypt definition", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: {
                                    bsonType: 'string',
                                    // missing algorithm
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/Missing algorithm for encrypted field/);
            });
        });

        describe("Edge cases", () => {
            it("should reject invalid encrypt definition", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            encryptedField: {
                                encrypt: "invalid"
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/Invalid encrypt definition/);
            });

            it("should reject invalid type at schema path", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            profile: null
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/Invalid schema at 'root.profile': must be an object definition/);
            });

            it("should reject properties in non-object bsonType", () => {
                const schema: IEncryptionSchema = {
                    "test.user": {
                        bsonType: 'string' as any, // Incorrect type for a schema with properties
                        properties: {
                            someField: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/fields with 'properties' must have bsonType 'object'/);
            });

            it("should reject non-object schema with nested fields", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'string',
                        properties: {
                            nestedField: {
                                encrypt: {
                                    bsonType: 'string',
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        }
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/fields with 'properties' must have bsonType 'object'/);
            });

            it("should reject schema with unallowed keys", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            validField: {
                                encrypt: {
                                    bsonType: 'string',
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            }
                        },
                        unknownProperty: "this is not allowed"
                    }
                };

                expect(() => validateCSFLESchema(schema)).toThrow(/Invalid key 'unknownProperty' found at/);
            });

            it("should validate schema with description, title and required fields", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            username: {
                                encrypt: {
                                    bsonType: 'string',
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                },
                                description: "User's unique identifier",
                                title: "Username"
                            }
                        },
                        required: ["username"],
                        description: "User collection schema",
                        title: "User Schema"
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it("should validate schema with encryptMetadata field", () => {
                const schema: any = {
                    "test.user": {
                        bsonType: 'object',
                        properties: {
                            sensitiveData: {
                                encrypt: {
                                    bsonType: 'string',
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                },
                                encryptMetadata: {
                                    keyId: "someKeyIdentifier"
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });

            it("should validate complex nested schema with multiple encryption types", () => {
                const schema: IEncryptionSchema = {
                    "test.patient": {
                        bsonType: 'object',
                        properties: {
                            patientId: {
                                encrypt: {
                                    bsonType: 'string' as TBsonType,
                                    algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                    keyId: []
                                }
                            },
                            personalInfo: {
                                bsonType: 'object',
                                properties: {
                                    name: {
                                        bsonType: 'object',
                                        properties: {
                                            first: {
                                                encrypt: {
                                                    bsonType: 'string' as TBsonType,
                                                    algorithm: EEncryptionAlgorithm.RANDOM,
                                                    keyId: []
                                                }
                                            },
                                            last: {
                                                encrypt: {
                                                    bsonType: 'string' as TBsonType,
                                                    algorithm: EEncryptionAlgorithm.RANDOM,
                                                    keyId: []
                                                }
                                            }
                                        }
                                    },
                                    ssn: {
                                        encrypt: {
                                            bsonType: 'string' as TBsonType,
                                            algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                            keyId: []
                                        }
                                    },
                                    dob: {
                                        encrypt: {
                                            bsonType: 'date' as TBsonType,
                                            algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                            keyId: []
                                        }
                                    }
                                }
                            },
                            medicalRecords: {
                                bsonType: 'object',
                                properties: {
                                    bloodType: {
                                        encrypt: {
                                            bsonType: 'string' as TBsonType,
                                            algorithm: EEncryptionAlgorithm.DETERMINISTIC,
                                            keyId: []
                                        }
                                    },
                                    record20230101: {
                                        encrypt: {
                                            bsonType: 'binData' as TBsonType,
                                            algorithm: EEncryptionAlgorithm.RANDOM,
                                            keyId: []
                                        }
                                    },
                                    record20230202: {
                                        encrypt: {
                                            bsonType: 'binData' as TBsonType,
                                            algorithm: EEncryptionAlgorithm.RANDOM,
                                            keyId: []
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                expect(validateCSFLESchema(schema)).toBe(true);
            });
        });
    });
});
