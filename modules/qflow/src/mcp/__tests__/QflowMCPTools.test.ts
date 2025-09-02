import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QflowMCPTools } from '../QflowMCPTools.js';

// Mock the MCPToolDiscoveryService
vi.mock('../../../../backend/services/MCPToolDiscoveryService.mjs', () => ({
  MCPToolDiscoveryService: vi.fn().mockImplementation(() => ({
    registerTools: vi.fn().mockResolvedValue({
      success: true,
      registrationId: 'test-registration-id',
      toolCount: 14,
      capabilityCount: 8
    })
  }))
}));

// Mock the event emitter
vi.mock('../../events/EventEmitter.js', () => ({
  qflowEventEmitter: {
    emitValidationPipelineExecuted: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('QflowMCPTools', () => {
  let qflowMCPTools: QflowMCPTools;

  beforeEach(() => {
    qflowMCPTools = new QflowMCPTools();
  });

  describe('Tool Registration', () => {
    it('should register all Qflow MCP tools successfully', async () => {
      await expect(qflowMCPTools.registerTools()).resolves.not.toThrow();
    });

    it('should register the correct number of tools', async () => {
      const tools = (qflowMCPTools as any).getQflowTools();
      
      expect(tools).toHaveLength(14);
      
      // Check that all expected tools are present
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('qflow.evaluate');
      expect(toolNames).toContain('qflow.flow.create');
      expect(toolNames).toContain('qflow.flow.get');
      expect(toolNames).toContain('qflow.flow.update');
      expect(toolNames).toContain('qflow.flow.list');
      expect(toolNames).toContain('qflow.exec.start');
      expect(toolNames).toContain('qflow.exec.pause');
      expect(toolNames).toContain('qflow.exec.resume');
      expect(toolNames).toContain('qflow.exec.abort');
      expect(toolNames).toContain('qflow.exec.status');
      expect(toolNames).toContain('qflow.exec.logs');
      expect(toolNames).toContain('qflow.exec.metrics');
      expect(toolNames).toContain('qflow.webhook.verify');
      expect(toolNames).toContain('qflow.policy.update');
    });

    it('should define proper tool parameters and returns', () => {
      const tools = (qflowMCPTools as any).getQflowTools();
      
      // Check qflow.evaluate tool
      const evaluateTool = tools.find((tool: any) => tool.name === 'qflow.evaluate');
      expect(evaluateTool).toBeDefined();
      expect(evaluateTool.parameters.properties.operationType).toBeDefined();
      expect(evaluateTool.parameters.required).toContain('operationType');
      expect(evaluateTool.parameters.required).toContain('operationId');
      expect(evaluateTool.parameters.required).toContain('actor');
      expect(evaluateTool.parameters.required).toContain('payload');
      
      // Check qflow.flow.create tool
      const createTool = tools.find((tool: any) => tool.name === 'qflow.flow.create');
      expect(createTool).toBeDefined();
      expect(createTool.parameters.properties.flowDefinition).toBeDefined();
      expect(createTool.parameters.required).toContain('flowDefinition');
      expect(createTool.parameters.required).toContain('actor');
      
      // Check qflow.exec.start tool
      const startTool = tools.find((tool: any) => tool.name === 'qflow.exec.start');
      expect(startTool).toBeDefined();
      expect(startTool.parameters.properties.flowId).toBeDefined();
      expect(startTool.parameters.required).toContain('flowId');
      expect(startTool.parameters.required).toContain('actor');
    });
  });

  describe('Capabilities', () => {
    it('should define all required capabilities', () => {
      const capabilities = (qflowMCPTools as any).getQflowCapabilities();
      
      expect(capabilities).toHaveProperty('universal-validation');
      expect(capabilities).toHaveProperty('serverless-execution');
      expect(capabilities).toHaveProperty('flow-management');
      expect(capabilities).toHaveProperty('execution-control');
      expect(capabilities).toHaveProperty('dao-governance');
      expect(capabilities).toHaveProperty('external-integration');
      expect(capabilities).toHaveProperty('audit-compliance');
      expect(capabilities).toHaveProperty('performance-monitoring');
    });

    it('should have proper capability definitions', () => {
      const capabilities = (qflowMCPTools as any).getQflowCapabilities();
      
      // Check universal-validation capability
      const universalValidation = capabilities['universal-validation'];
      expect(universalValidation.supported).toBe(true);
      expect(universalValidation.version).toBe('1.0.0');
      expect(universalValidation.features).toContain('qlock-integration');
      expect(universalValidation.features).toContain('qonsent-integration');
      expect(universalValidation.features).toContain('qindex-integration');
      expect(universalValidation.features).toContain('qerberos-integration');
      
      // Check serverless-execution capability
      const serverlessExecution = capabilities['serverless-execution'];
      expect(serverlessExecution.supported).toBe(true);
      expect(serverlessExecution.features).toContain('wasm-sandboxes');
      expect(serverlessExecution.features).toContain('distributed-nodes');
      expect(serverlessExecution.features).toContain('resource-limits');
      expect(serverlessExecution.features).toContain('security-isolation');
    });
  });

  describe('Compatibility', () => {
    it('should define compatibility information', () => {
      const compatibility = (qflowMCPTools as any).getCompatibilityInfo();
      
      expect(compatibility.minVersion).toBe('0.1.0');
      expect(compatibility.maxVersion).toBe('1.0.0');
      expect(compatibility.supportedVersions).toContain('0.1.0');
      expect(compatibility.breakingChanges).toEqual([]);
      expect(compatibility.deprecatedFeatures).toEqual([]);
    });
  });

  describe('Tool Validation', () => {
    it('should validate tool parameter schemas', () => {
      const tools = (qflowMCPTools as any).getQflowTools();
      
      tools.forEach((tool: any) => {
        // Each tool should have required properties
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.returns).toBeDefined();
        
        // Parameters should be valid JSON Schema
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters.properties).toBeDefined();
        
        // Returns should be valid JSON Schema
        expect(tool.returns.type).toBe('object');
        expect(tool.returns.properties).toBeDefined();
      });
    });

    it('should have consistent naming convention', () => {
      const tools = (qflowMCPTools as any).getQflowTools();
      
      tools.forEach((tool: any) => {
        expect(tool.name).toMatch(/^qflow\./);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle registration failures gracefully', async () => {
      // Mock a failed registration
      const mockMCPDiscovery = {
        registerTools: vi.fn().mockResolvedValue({
          success: false,
          errors: ['Test error']
        })
      };
      
      (qflowMCPTools as any).mcpDiscovery = mockMCPDiscovery;
      
      await expect(qflowMCPTools.registerTools()).rejects.toThrow('MCP tool registration failed: Test error');
    });
  });
});