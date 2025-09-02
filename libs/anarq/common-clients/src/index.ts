// Common client libraries for Q ecosystem modules

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  constructor(private config: HttpClientConfig) {}

  async get(path: string, options?: any): Promise<any> {
    // Mock implementation
    return { status: 'ok', data: {} };
  }

  async post(path: string, data: any, options?: any): Promise<any> {
    // Mock implementation
    return { status: 'ok', data: {} };
  }
}

export interface MCPClientConfig {
  host: string;
  port: number;
  basePath?: string;
}

export class MCPClient {
  constructor(private config: MCPClientConfig) {}

  async callTool(toolName: string, params: any): Promise<any> {
    // Mock implementation
    return { success: true, result: {} };
  }
}

// Re-export from existing implementation if available
export * from './http/base-client';
export * from './mcp/McpClient';
export * from './event-bus/event-bus';