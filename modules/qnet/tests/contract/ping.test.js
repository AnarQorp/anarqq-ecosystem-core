/**
 * Ping Contract Tests
 * 
 * Tests the ping request/response contracts against JSON schemas
 */

import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load schemas
const pingSchema = JSON.parse(
  readFileSync(join(process.cwd(), 'contracts/ping.schema.json'), 'utf8')
);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

describe('Ping Contract Tests', () => {
  describe('PingRequest schema validation', () => {
    const validatePingRequest = ajv.compile(pingSchema.definitions.PingRequest);

    it('should validate minimal ping request', () => {
      const request = {};
      const valid = validatePingRequest(request);
      expect(valid).toBe(true);
    });

    it('should validate complete ping request', () => {
      const request = {
        nodeId: 'qnet-us-east-primary',
        timeout: 5000,
        count: 3,
        payload: 'test-payload'
      };
      const valid = validatePingRequest(request);
      expect(valid).toBe(true);
    });

    it('should reject invalid node ID format', () => {
      const request = {
        nodeId: 'invalid-node-id'
      };
      const valid = validatePingRequest(request);
      expect(valid).toBe(false);
      expect(validatePingRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/nodeId',
          keyword: 'pattern'
        })
      );
    });

    it('should reject timeout out of range', () => {
      const request = {
        timeout: 50 // Below minimum of 100
      };
      const valid = validatePingRequest(request);
      expect(valid).toBe(false);
      expect(validatePingRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/timeout',
          keyword: 'minimum'
        })
      );
    });

    it('should reject count out of range', () => {
      const request = {
        count: 15 // Above maximum of 10
      };
      const valid = validatePingRequest(request);
      expect(valid).toBe(false);
      expect(validatePingRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/count',
          keyword: 'maximum'
        })
      );
    });

    it('should reject payload too long', () => {
      const request = {
        payload: 'x'.repeat(1025) // Above maximum of 1024
      };
      const valid = validatePingRequest(request);
      expect(valid).toBe(false);
      expect(validatePingRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/payload',
          keyword: 'maxLength'
        })
      );
    });
  });

  describe('PingResult schema validation', () => {
    const validatePingResult = ajv.compile(pingSchema.definitions.PingResult);

    it('should validate successful ping result', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        latency: 45.5,
        success: true,
        timestamp: '2024-01-15T10:30:00Z',
        sequence: 1
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(true);
    });

    it('should validate failed ping result', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        success: false,
        error: 'Connection timeout',
        timestamp: '2024-01-15T10:30:00Z',
        sequence: 1
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(true);
    });

    it('should require nodeId', () => {
      const result = {
        success: true,
        timestamp: '2024-01-15T10:30:00Z'
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(false);
      expect(validatePingResult.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'nodeId' }
        })
      );
    });

    it('should require success field', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        timestamp: '2024-01-15T10:30:00Z'
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(false);
      expect(validatePingResult.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'success' }
        })
      );
    });

    it('should require timestamp', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        success: true
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(false);
      expect(validatePingResult.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'timestamp' }
        })
      );
    });

    it('should reject negative latency', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        latency: -10,
        success: true,
        timestamp: '2024-01-15T10:30:00Z'
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(false);
      expect(validatePingResult.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/latency',
          keyword: 'minimum'
        })
      );
    });

    it('should reject invalid timestamp format', () => {
      const result = {
        nodeId: 'qnet-us-east-primary',
        success: true,
        timestamp: 'invalid-timestamp'
      };
      const valid = validatePingResult(result);
      expect(valid).toBe(false);
      expect(validatePingResult.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/timestamp',
          keyword: 'format'
        })
      );
    });
  });

  describe('PingResponse schema validation', () => {
    const validatePingResponse = ajv.compile(pingSchema.definitions.PingResponse);

    it('should validate complete ping response', () => {
      const response = {
        results: [
          {
            nodeId: 'qnet-us-east-primary',
            latency: 45.5,
            success: true,
            timestamp: '2024-01-15T10:30:00Z',
            sequence: 1
          },
          {
            nodeId: 'qnet-us-west-primary',
            latency: 52.3,
            success: true,
            timestamp: '2024-01-15T10:30:01Z',
            sequence: 1
          }
        ],
        summary: {
          totalNodes: 2,
          successfulPings: 2,
          averageLatency: 48.9,
          minLatency: 45.5,
          maxLatency: 52.3,
          packetLoss: 0.0
        }
      };
      const valid = validatePingResponse(response);
      expect(valid).toBe(true);
    });

    it('should validate response with failed pings', () => {
      const response = {
        results: [
          {
            nodeId: 'qnet-us-east-primary',
            latency: 45.5,
            success: true,
            timestamp: '2024-01-15T10:30:00Z',
            sequence: 1
          },
          {
            nodeId: 'qnet-failed-node',
            success: false,
            error: 'Connection timeout',
            timestamp: '2024-01-15T10:30:01Z',
            sequence: 1
          }
        ],
        summary: {
          totalNodes: 2,
          successfulPings: 1,
          averageLatency: 45.5,
          minLatency: 45.5,
          maxLatency: 45.5,
          packetLoss: 0.5
        }
      };
      const valid = validatePingResponse(response);
      expect(valid).toBe(true);
    });

    it('should require results array', () => {
      const response = {
        summary: {
          totalNodes: 0,
          successfulPings: 0
        }
      };
      const valid = validatePingResponse(response);
      expect(valid).toBe(false);
      expect(validatePingResponse.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'results' }
        })
      );
    });

    it('should require summary object', () => {
      const response = {
        results: []
      };
      const valid = validatePingResponse(response);
      expect(valid).toBe(false);
      expect(validatePingResponse.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'summary' }
        })
      );
    });

    it('should reject invalid packet loss range', () => {
      const response = {
        results: [],
        summary: {
          totalNodes: 0,
          successfulPings: 0,
          packetLoss: 1.5 // Above maximum of 1.0
        }
      };
      const valid = validatePingResponse(response);
      expect(valid).toBe(false);
      expect(validatePingResponse.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/summary/packetLoss',
          keyword: 'maximum'
        })
      );
    });
  });
});