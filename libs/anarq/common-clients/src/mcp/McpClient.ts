import { McpClientConfig, McpToolConfig, QError, ErrorCodes, RequestContext } from '../types/client.js';
import { RetryHandler } from '../retry/RetryHandler.js';
import { IdentityRef } from '@anarq/common-schemas';

/**
 * MCP (Model Context Protocol) client for serverless function calls
 */
export class McpClient {
  private readonly config: Required<McpClientConfig>;
  private readonly retryHandler?: RetryHandler;
  private readonly tools: Map<string, McpToolConfig> = new Map();

  constructor(config: McpClientConfig) {
    this.config = {
      timeout: 30000,
      retryPolicy: undefined,
      ...config
    } as Required<McpClientConfig>;

    // Register tools
    config.tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    if (this.config.retryPolicy) {
      this.retryHandler = new RetryHandler(this.config.retryPolicy);
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool<T = any>(
    toolName: string, 
    input: any, 
    options: McpCallOptions = {}
  ): Promise<T> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw this.createToolNotFoundError(toolName);
    }

    const context = this.createRequestContext(options);
    
    // Validate input against schema
    this.validateInput(tool, input);

    const callFn = async (): Promise<T> => {
      return this.executeToolCall(tool, input, context, options);
    };

    // Apply retry policy if configured
    return this.retryHandler 
      ? this.retryHandler.execute(callFn)
      : callFn();
  }

  /**
   * Get available tools
   */
  getTools(): McpToolConfig[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get specific tool configuration
   */
  getTool(name: string): McpToolConfig | undefined {
    return this.tools.get(name);
  }

  /**
   * Register a new tool
   */
  registerTool(tool: McpToolConfig): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Execute the actual tool call
   */
  private async executeToolCall<T>(
    tool: McpToolConfig,
    input: any,
    context: RequestContext,
    options: McpCallOptions
  ): Promise<T> {
    // This is a placeholder for the actual MCP protocol implementation
    // In a real implementation, this would:
    // 1. Serialize the request according to MCP protocol
    // 2. Send the request to the appropriate handler/service
    // 3. Handle the response and deserialize it
    // 4. Validate the output against the tool's output schema
    
    try {
      // Simulate tool execution with timeout
      const timeout = options.timeout || this.config.timeout;
      const result = await Promise.race([
        this.simulateToolExecution(tool, input, context),
        this.createTimeoutPromise(timeout)
      ]);

      // Validate output against schema
      this.validateOutput(tool, result);

      return result as T;
    } catch (error) {
      throw this.wrapToolError(error as Error, tool.name, context);
    }
  }

  /**
   * Simulate tool execution (placeholder)
   */
  private async simulateToolExecution(
    tool: McpToolConfig,
    input: any,
    context: RequestContext
  ): Promise<any> {
    // This is a simulation - in real implementation, this would call the actual MCP handler
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
    
    return {
      success: true,
      result: `Tool ${tool.name} executed successfully`,
      input,
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('MCP tool call timeout') as QError;
        error.code = ErrorCodes.TIMEOUT_ERROR;
        error.retryable = true;
        reject(error);
      }, timeout);
    });
  }

  /**
   * Validate input against tool schema
   */
  private validateInput(tool: McpToolConfig, input: any): void {
    // Placeholder for JSON schema validation
    // In real implementation, use ajv or similar to validate against tool.inputSchema
    if (!input && tool.inputSchema.required) {
      throw this.createValidationError(`Input is required for tool ${tool.name}`);
    }
  }

  /**
   * Validate output against tool schema
   */
  private validateOutput(tool: McpToolConfig, output: any): void {
    // Placeholder for JSON schema validation
    // In real implementation, use ajv or similar to validate against tool.outputSchema
    if (!output && tool.outputSchema.required) {
      throw this.createValidationError(`Output validation failed for tool ${tool.name}`);
    }
  }

  /**
   * Create request context
   */
  private createRequestContext(options: McpCallOptions): RequestContext {
    return {
      requestId: options.requestId || this.generateRequestId(),
      correlationId: options.correlationId,
      traceId: options.traceId,
      spanId: options.spanId,
      identity: options.identity || this.config.identity,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create tool not found error
   */
  private createToolNotFoundError(toolName: string): QError {
    const error = new Error(`MCP tool '${toolName}' not found`) as QError;
    error.code = ErrorCodes.DEPENDENCY_MISSING;
    error.retryable = false;
    error.suggestedActions = [
      'Check tool name spelling',
      'Verify tool is registered',
      'Check available tools with getTools()'
    ];
    return error;
  }

  /**
   * Create validation error
   */
  private createValidationError(message: string): QError {
    const error = new Error(message) as QError;
    error.code = ErrorCodes.VERSION_CONFLICT;
    error.retryable = false;
    return error;
  }

  /**
   * Wrap tool execution errors
   */
  private wrapToolError(error: Error, toolName: string, context: RequestContext): QError {
    const qError = error as QError;
    if (!qError.code) {
      qError.code = ErrorCodes.SERVICE_UNAVAILABLE;
    }
    qError.requestId = context.requestId;
    qError.timestamp = context.timestamp;
    qError.details = {
      ...qError.details,
      toolName,
      context
    };
    return qError;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * MCP call options
 */
export interface McpCallOptions {
  timeout?: number;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  identity?: IdentityRef;
}