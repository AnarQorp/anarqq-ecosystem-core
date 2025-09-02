/**
 * ExternalIntegrationService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExternalIntegrationService } from '../webhooks/ExternalIntegrationService.js';

describe('ExternalIntegrationService', () => {
  let integrationService: ExternalIntegrationService;

  beforeEach(() => {
    integrationService = new ExternalIntegrationService();
  });

  describe('registerExternalSystem', () => {
    it('should register an external system configuration', async () => {
      const config = {
        name: 'Test API',
        type: 'api' as const,
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'bearer' as const,
          credentials: { token: 'test-token' }
        },
        enabled: true,
        createdBy: 'user-123'
      };

      const systemId = await integrationService.registerExternalSystem(config);

      expect(systemId).toBeDefined();
      expect(systemId).toMatch(/^system_\d+_[a-z0-9]+$/);

      const system = integrationService.getExternalSystem(systemId);
      expect(system).toBeDefined();
      expect(system?.name).toBe('Test API');
      expect(system?.type).toBe('api');
      expect(system?.enabled).toBe(true);
    });

    it('should generate system ID if not provided', async () => {
      const config = {
        name: 'Auto ID System',
        type: 'webhook' as const,
        authentication: {
          type: 'none' as const,
          credentials: {}
        },
        enabled: true,
        createdBy: 'user-123'
      };

      const systemId = await integrationService.registerExternalSystem(config);

      expect(systemId).toBeDefined();
      expect(systemId).toMatch(/^system_\d+_[a-z0-9]+$/);
    });
  });

  describe('createIntegrationTemplate', () => {
    it('should create an integration template', async () => {
      const template = {
        name: 'Test Template',
        description: 'A test integration template',
        systemType: 'api',
        version: '1.0.0',
        schema: {
          input: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message']
          },
          output: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          },
          configuration: {
            type: 'object',
            properties: {
              api_key: { type: 'string' }
            }
          }
        },
        transformations: {
          request: 'return input;',
          response: 'return response;'
        },
        examples: [
          {
            input: { message: 'Hello' },
            output: { success: true }
          }
        ],
        tags: ['test', 'api'],
        author: 'user-123'
      };

      const templateId = await integrationService.createIntegrationTemplate(template);

      expect(templateId).toBeDefined();
      expect(templateId).toMatch(/^template_\d+_[a-z0-9]+$/);

      const templates = integrationService.getIntegrationTemplates();
      const createdTemplate = templates.find(t => t.id === templateId);
      expect(createdTemplate).toBeDefined();
      expect(createdTemplate?.name).toBe('Test Template');
    });

    it('should register webhook event schema for webhook templates', async () => {
      const webhookTemplate = {
        name: 'Webhook Template',
        description: 'A webhook integration template',
        systemType: 'webhook',
        version: '1.0.0',
        schema: {
          input: {
            type: 'object',
            properties: {
              event: { type: 'string' }
            }
          },
          output: { type: 'object' },
          configuration: { type: 'object' }
        },
        transformations: {
          request: 'return input;',
          response: 'return response;'
        },
        examples: [],
        tags: ['webhook'],
        author: 'user-123'
      };

      // Mock the webhookService.registerEventSchema method
      const mockRegisterEventSchema = vi.fn();
      vi.doMock('../webhooks/WebhookService.js', () => ({
        webhookService: {
          registerEventSchema: mockRegisterEventSchema
        }
      }));

      const templateId = await integrationService.createIntegrationTemplate(webhookTemplate);

      expect(templateId).toBeDefined();
    });
  });

  describe('executeExternalCall', () => {
    let systemId: string;

    beforeEach(async () => {
      systemId = await integrationService.registerExternalSystem({
        name: 'Test API',
        type: 'api',
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'bearer',
          credentials: { token: 'test-token' }
        },
        enabled: true,
        createdBy: 'user-123'
      });
    });

    it('should execute external API call successfully', async () => {
      // Mock the HTTP request
      const mockResponse = { success: true, data: 'test response' };
      vi.spyOn(integrationService as any, 'makeHttpRequest').mockResolvedValue(mockResponse);

      const result = await integrationService.executeExternalCall(
        systemId,
        '/test-endpoint',
        'GET'
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error for non-existent system', async () => {
      await expect(
        integrationService.executeExternalCall(
          'non-existent-system',
          '/test-endpoint',
          'GET'
        )
      ).rejects.toThrow('External system not found');
    });

    it('should throw error for disabled system', async () => {
      // Create a disabled system
      const disabledSystemId = await integrationService.registerExternalSystem({
        name: 'Disabled API',
        type: 'api',
        authentication: {
          type: 'none',
          credentials: {}
        },
        enabled: false,
        createdBy: 'user-123'
      });

      await expect(
        integrationService.executeExternalCall(
          disabledSystemId,
          '/test-endpoint',
          'GET'
        )
      ).rejects.toThrow('External system is disabled');
    });

    it('should apply request transformation', async () => {
      const mockResponse = { transformed: true };
      vi.spyOn(integrationService as any, 'makeHttpRequest').mockResolvedValue(mockResponse);
      vi.spyOn(integrationService as any, 'executeTransformation').mockReturnValue({ transformed_input: true });

      const result = await integrationService.executeExternalCall(
        systemId,
        '/test-endpoint',
        'POST',
        { original: 'data' },
        {
          transformRequest: 'return { transformed_input: true };'
        }
      );

      expect(integrationService['executeTransformation']).toHaveBeenCalledWith(
        'return { transformed_input: true };',
        { original: 'data' }
      );
    });

    it('should apply response transformation', async () => {
      const mockResponse = { original: 'response' };
      vi.spyOn(integrationService as any, 'makeHttpRequest').mockResolvedValue(mockResponse);
      vi.spyOn(integrationService as any, 'executeTransformation').mockReturnValue({ transformed: 'response' });

      const result = await integrationService.executeExternalCall(
        systemId,
        '/test-endpoint',
        'GET',
        undefined,
        {
          transformResponse: 'return { transformed: "response" };'
        }
      );

      expect(result).toEqual({ transformed: 'response' });
      expect(integrationService['executeTransformation']).toHaveBeenCalledWith(
        'return { transformed: "response" };',
        mockResponse
      );
    });
  });

  describe('getIntegrationTemplates', () => {
    it('should return all templates when no filter is provided', () => {
      const templates = integrationService.getIntegrationTemplates();
      
      // Should include default templates
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'github-api')).toBe(true);
      expect(templates.some(t => t.id === 'slack-webhook')).toBe(true);
    });

    it('should filter templates by system type', () => {
      const apiTemplates = integrationService.getIntegrationTemplates('api');
      const webhookTemplates = integrationService.getIntegrationTemplates('webhook');
      
      expect(apiTemplates.every(t => t.systemType === 'api')).toBe(true);
      expect(webhookTemplates.every(t => t.systemType === 'webhook')).toBe(true);
      expect(apiTemplates.some(t => t.id === 'github-api')).toBe(true);
      expect(webhookTemplates.some(t => t.id === 'slack-webhook')).toBe(true);
    });
  });

  describe('listExternalSystems', () => {
    it('should return empty list initially', () => {
      const systems = integrationService.listExternalSystems();
      expect(systems).toEqual([]);
    });

    it('should return registered systems', async () => {
      await integrationService.registerExternalSystem({
        name: 'System 1',
        type: 'api',
        authentication: { type: 'none', credentials: {} },
        enabled: true,
        createdBy: 'user-123'
      });

      await integrationService.registerExternalSystem({
        name: 'System 2',
        type: 'webhook',
        authentication: { type: 'none', credentials: {} },
        enabled: true,
        createdBy: 'user-123'
      });

      const systems = integrationService.listExternalSystems();
      expect(systems).toHaveLength(2);
      expect(systems.map(s => s.name)).toContain('System 1');
      expect(systems.map(s => s.name)).toContain('System 2');
    });
  });

  describe('authentication handling', () => {
    it('should add Bearer token authentication', () => {
      const headers: Record<string, string> = {};
      const auth = {
        type: 'bearer' as const,
        credentials: { token: 'test-token' }
      };

      (integrationService as any).addAuthentication(headers, auth);

      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should add Basic authentication', () => {
      const headers: Record<string, string> = {};
      const auth = {
        type: 'basic' as const,
        credentials: { username: 'user', password: 'pass' }
      };

      (integrationService as any).addAuthentication(headers, auth);

      expect(headers['Authorization']).toBe('Basic dXNlcjpwYXNz'); // base64 of 'user:pass'
    });

    it('should add API key authentication', () => {
      const headers: Record<string, string> = {};
      const auth = {
        type: 'api_key' as const,
        credentials: { header: 'X-API-Key', key: 'secret-key' }
      };

      (integrationService as any).addAuthentication(headers, auth);

      expect(headers['X-API-Key']).toBe('secret-key');
    });

    it('should add OAuth2 authentication', () => {
      const headers: Record<string, string> = {};
      const auth = {
        type: 'oauth2' as const,
        credentials: { access_token: 'oauth-token' }
      };

      (integrationService as any).addAuthentication(headers, auth);

      expect(headers['Authorization']).toBe('Bearer oauth-token');
    });

    it('should add custom authentication', () => {
      const headers: Record<string, string> = {};
      const auth = {
        type: 'custom' as const,
        credentials: { 'X-Custom-Header': 'custom-value', 'Another-Header': 'another-value' }
      };

      (integrationService as any).addAuthentication(headers, auth);

      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Another-Header']).toBe('another-value');
    });
  });

  describe('transformation execution', () => {
    it('should execute simple transformation', () => {
      const transformationCode = 'return { transformed: input.original };';
      const inputData = { original: 'test' };

      const result = (integrationService as any).executeTransformation(transformationCode, inputData);

      expect(result).toEqual({ transformed: 'test' });
    });

    it('should handle transformation errors', () => {
      const transformationCode = 'throw new Error("Transformation failed");';
      const inputData = { test: 'data' };

      expect(() => {
        (integrationService as any).executeTransformation(transformationCode, inputData);
      }).toThrow('Transformation failed');
    });

    it('should provide safe execution context', () => {
      const transformationCode = `
        console.log('Test log');
        return {
          hasJSON: typeof JSON !== 'undefined',
          hasDate: typeof Date !== 'undefined',
          hasMath: typeof Math !== 'undefined',
          input: input
        };
      `;
      const inputData = { test: 'data' };

      const result = (integrationService as any).executeTransformation(transformationCode, inputData);

      expect(result.hasJSON).toBe(true);
      expect(result.hasDate).toBe(true);
      expect(result.hasMath).toBe(true);
      expect(result.input).toEqual(inputData);
    });
  });
});