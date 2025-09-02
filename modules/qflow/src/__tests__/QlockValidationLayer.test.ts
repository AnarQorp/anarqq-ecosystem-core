/**
 * Qlock Validation Layer Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  QlockValidationLayer, 
  qlockValidationLayer,
  EncryptedData,
  QlockValidationResult
} from '../validation/QlockValidationLayer.js';
import { ValidationContext } from '../validation/UniversalValidationPipeline.js';

describe('QlockValidationLayer', () => {
  let qlockLayer: QlockValidationLayer;
  let mockContext: ValidationContext;

  beforeEach(() => {
    qlockLayer = new QlockValidationLayer();
    mockContext = {
      requestId: 'test-request-001',
      timestamp: new Date().toISOString(),
      source: 'test',
      metadata: {}
    };
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = qlockLayer.getConfig();
      
      expect(config.endpoint).toBeDefined();
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
      expect(config.encryptionAlgorithm).toBe('AES-256-GCM');
    });

    it('should initialize with custom configuration', () => {
      const customLayer = new QlockValidationLayer({
        timeout: 5000,
        retryAttempts: 5,
        encryptionAlgorithm: 'AES-128-GCM'
      });

      const config = customLayer.getConfig();
      
      expect(config.timeout).toBe(5000);
      expect(config.retryAttempts).toBe(5);
      expect(config.encryptionAlgorithm).toBe('AES-128-GCM');
    });

    it('should provide validation layer configuration', () => {
      const layerConfig = qlockLayer.getValidationLayer();
      
      expect(layerConfig.layerId).toBe('qlock-validation');
      expect(layerConfig.name).toBe('Qlock Encryption Validation');
      expect(layerConfig.required).toBe(true);
      expect(layerConfig.priority).toBe(1);
    });
  });

  describe('data encryption', () => {
    it('should encrypt data successfully', async () => {
      const testData = { message: 'Hello, World!', value: 42 };
      
      const encryptedData = await qlockLayer.encryptData(testData, mockContext);
      
      expect(encryptedData).toBeDefined();
      expect(encryptedData.data).toBeDefined();
      expect(encryptedData.keyId).toBeDefined();
      expect(encryptedData.algorithm).toBe('AES-256-GCM');
      expect(encryptedData.iv).toBeDefined();
      expect(encryptedData.signature).toBeDefined();
      expect(encryptedData.timestamp).toBeDefined();
    });

    it('should encrypt data with specific key', async () => {
      const testData = { secret: 'confidential' };
      const keyId = 'default-key-2';
      
      const encryptedData = await qlockLayer.encryptData(testData, mockContext, keyId);
      
      expect(encryptedData.keyId).toBe(keyId);
    });

    it('should handle encryption errors', async () => {
      const invalidLayer = new QlockValidationLayer();
      
      // Mock the internal service to throw an error
      const originalEncrypt = (qlockLayer as any).qlockService.encrypt;
      (qlockLayer as any).qlockService.encrypt = vi.fn().mockRejectedValue(new Error('Encryption failed'));
      
      await expect(qlockLayer.encryptData({ test: 'data' }, mockContext))
        .rejects.toThrow('Encryption failed');
      
      // Restore original method
      (qlockLayer as any).qlockService.encrypt = originalEncrypt;
    });
  });

  describe('data decryption', () => {
    it('should decrypt data successfully', async () => {
      const testData = { message: 'Hello, World!', value: 42 };
      
      // First encrypt the data
      const encryptedData = await qlockLayer.encryptData(testData, mockContext);
      
      // Then decrypt it
      const decryptedData = await qlockLayer.decryptData(encryptedData, mockContext);
      
      expect(decryptedData).toEqual(testData);
    });

    it('should handle decryption errors', async () => {
      const invalidEncryptedData: EncryptedData = {
        data: 'invalid-encrypted-data',
        keyId: 'non-existent-key',
        algorithm: 'AES-256-GCM',
        iv: 'invalid-iv',
        signature: 'invalid-signature',
        timestamp: new Date().toISOString()
      };
      
      await expect(qlockLayer.decryptData(invalidEncryptedData, mockContext))
        .rejects.toThrow();
    });

    it('should detect tampered data', async () => {
      const testData = { message: 'Hello, World!' };
      
      // Encrypt data
      const encryptedData = await qlockLayer.encryptData(testData, mockContext);
      
      // Tamper with the signature
      const tamperedData = { ...encryptedData, signature: 'tampered-signature' };
      
      await expect(qlockLayer.decryptData(tamperedData, mockContext))
        .rejects.toThrow('Invalid signature');
    });
  });

  describe('validation', () => {
    it('should pass validation for data without encryption', async () => {
      const plainData = { message: 'Hello, World!', value: 42 };
      
      const result = await qlockLayer.validateEncryptedData(plainData, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.message).toContain('No encrypted data found');
      expect(result.details.encryptionValid).toBe(true);
      expect(result.details.securityLevel).toBe('medium');
    });

    it('should validate encrypted data successfully', async () => {
      const testData = { secret: 'confidential' };
      const encryptedData = await qlockLayer.encryptData(testData, mockContext);
      
      // Create data structure with encrypted field
      const dataWithEncryption = {
        publicInfo: 'not secret',
        encryptedField: encryptedData
      };
      
      const result = await qlockLayer.validateEncryptedData(dataWithEncryption, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.encryptionValid).toBe(true);
      expect(result.details.securityLevel).toBe('high');
    });

    it('should detect invalid encrypted data', async () => {
      const invalidEncryptedData: EncryptedData = {
        data: 'invalid-data',
        keyId: 'non-existent-key',
        algorithm: 'AES-256-GCM',
        iv: 'invalid-iv',
        signature: 'invalid-signature',
        timestamp: new Date().toISOString()
      };
      
      const dataWithInvalidEncryption = {
        encryptedField: invalidEncryptedData
      };
      
      const result = await qlockLayer.validateEncryptedData(dataWithInvalidEncryption, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.encryptionValid).toBe(false);
      expect(result.details.securityLevel).toBe('low');
    });

    it('should warn when key rotation is needed', async () => {
      // Create a layer with very short key rotation interval
      const shortRotationLayer = new QlockValidationLayer({
        keyRotationInterval: 1 // 1ms - immediate rotation needed
      });
      
      const testData = { secret: 'confidential' };
      const encryptedData = await shortRotationLayer.encryptData(testData, mockContext);
      
      // Wait a bit to ensure key rotation is needed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const dataWithEncryption = {
        encryptedField: encryptedData
      };
      
      const result = await shortRotationLayer.validateEncryptedData(dataWithEncryption, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('key rotation recommended');
      expect(result.details.keyRotationNeeded).toBe(true);
      expect(result.details.securityLevel).toBe('medium');
    });

    it('should handle nested encrypted data', async () => {
      const testData1 = { secret1: 'confidential1' };
      const testData2 = { secret2: 'confidential2' };
      
      const encryptedData1 = await qlockLayer.encryptData(testData1, mockContext);
      const encryptedData2 = await qlockLayer.encryptData(testData2, mockContext);
      
      const nestedData = {
        level1: {
          encrypted: encryptedData1,
          level2: {
            encrypted: encryptedData2,
            plain: 'not encrypted'
          }
        }
      };
      
      const result = await qlockLayer.validateEncryptedData(nestedData, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.encryptionValid).toBe(true);
    });
  });

  describe('key management', () => {
    it('should rotate keys successfully', async () => {
      const originalKeyId = 'default-key-1';
      
      const newKeyId = await qlockLayer.rotateKey(originalKeyId);
      
      expect(newKeyId).toBeDefined();
      expect(newKeyId).not.toBe(originalKeyId);
      expect(newKeyId).toContain('rotated');
    });

    it('should handle key rotation errors', async () => {
      const nonExistentKeyId = 'non-existent-key';
      
      await expect(qlockLayer.rotateKey(nonExistentKeyId))
        .rejects.toThrow('Key not found for rotation');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const originalConfig = qlockLayer.getConfig();
      
      qlockLayer.updateConfig({
        timeout: 15000,
        retryAttempts: 5
      });
      
      const updatedConfig = qlockLayer.getConfig();
      
      expect(updatedConfig.timeout).toBe(15000);
      expect(updatedConfig.retryAttempts).toBe(5);
      expect(updatedConfig.endpoint).toBe(originalConfig.endpoint); // Should remain unchanged
    });
  });

  describe('validator function', () => {
    it('should provide validator function for pipeline integration', async () => {
      const validator = qlockLayer.getValidator();
      
      expect(typeof validator).toBe('function');
      
      const testData = { message: 'test' };
      const result = await validator(testData, mockContext);
      
      expect(result).toBeDefined();
      expect(result.layerId).toBe('qlock-validation');
      expect(result.status).toBe('passed');
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock the internal service to throw an error
      const originalValidate = (qlockLayer as any).qlockService.validateEncryption;
      (qlockLayer as any).qlockService.validateEncryption = vi.fn().mockRejectedValue(new Error('Service error'));
      
      const testData = { message: 'test' };
      const encryptedData = await qlockLayer.encryptData(testData, mockContext);
      
      // Restore the mock after encryption
      (qlockLayer as any).qlockService.validateEncryption = originalValidate;
      
      // Now mock it to throw during validation
      (qlockLayer as any).qlockService.validateEncryption = vi.fn().mockRejectedValue(new Error('Validation service error'));
      
      const dataWithEncryption = { encryptedField: encryptedData };
      const result = await qlockLayer.validateEncryptedData(dataWithEncryption, mockContext) as QlockValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.message).toContain('validation failed');
      expect(result.details.error).toBeDefined();
      
      // Restore original method
      (qlockLayer as any).qlockService.validateEncryption = originalValidate;
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton instance', () => {
      expect(qlockValidationLayer).toBeInstanceOf(QlockValidationLayer);
    });
  });
});