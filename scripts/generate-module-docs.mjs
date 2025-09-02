#!/usr/bin/env node

/**
 * Module Documentation Generator
 * Generates comprehensive documentation for all Q ecosystem modules
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const MODULES_DIR = 'modules';
const DOCS_OUTPUT_DIR = 'docs/modules';
const TEMPLATES_DIR = 'scripts/templates/docs';

class ModuleDocGenerator {
  constructor() {
    this.modules = [];
    this.templates = {};
  }

  async init() {
    await this.loadTemplates();
    await this.discoverModules();
  }

  async loadTemplates() {
    try {
      const templateFiles = await fs.readdir(TEMPLATES_DIR);
      for (const file of templateFiles) {
        if (file.endsWith('.md')) {
          const templateName = file.replace('.md', '');
          const templatePath = path.join(TEMPLATES_DIR, file);
          this.templates[templateName] = await fs.readFile(templatePath, 'utf8');
        }
      }
    } catch (error) {
      console.warn('Templates directory not found, using built-in templates');
      this.loadBuiltInTemplates();
    }
  }

  loadBuiltInTemplates() {
    this.templates = {
      'api-reference': this.getApiReferenceTemplate(),
      'mcp-tools': this.getMcpToolsTemplate(),
      'deployment-guide': this.getDeploymentGuideTemplate(),
      'troubleshooting': this.getTroubleshootingTemplate(),
      'integration-guide': this.getIntegrationGuideTemplate()
    };
  }

  async discoverModules() {
    const moduleNames = await fs.readdir(MODULES_DIR);
    
    for (const moduleName of moduleNames) {
      const modulePath = path.join(MODULES_DIR, moduleName);
      const stat = await fs.stat(modulePath);
      
      if (stat.isDirectory()) {
        const moduleInfo = await this.analyzeModule(moduleName, modulePath);
        if (moduleInfo) {
          this.modules.push(moduleInfo);
        }
      }
    }
  }

  async analyzeModule(moduleName, modulePath) {
    try {
      const packageJsonPath = path.join(modulePath, 'package.json');
      const openApiPath = path.join(modulePath, 'openapi.yaml');
      const mcpJsonPath = path.join(modulePath, 'mcp.json');
      const readmePath = path.join(modulePath, 'README.md');

      const moduleInfo = {
        name: moduleName,
        path: modulePath,
        hasPackageJson: false,
        hasOpenApi: false,
        hasMcp: false,
        hasReadme: false,
        packageInfo: null,
        openApiSpec: null,
        mcpSpec: null,
        readmeContent: null
      };

      // Check package.json
      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        moduleInfo.packageInfo = JSON.parse(packageContent);
        moduleInfo.hasPackageJson = true;
      } catch (error) {
        console.warn(`No package.json found for ${moduleName}`);
      }

      // Check OpenAPI spec
      try {
        const openApiContent = await fs.readFile(openApiPath, 'utf8');
        moduleInfo.openApiSpec = yaml.load(openApiContent);
        moduleInfo.hasOpenApi = true;
      } catch (error) {
        console.warn(`No OpenAPI spec found for ${moduleName}`);
      }

      // Check MCP spec
      try {
        const mcpContent = await fs.readFile(mcpJsonPath, 'utf8');
        moduleInfo.mcpSpec = JSON.parse(mcpContent);
        moduleInfo.hasMcp = true;
      } catch (error) {
        console.warn(`No MCP spec found for ${moduleName}`);
      }

      // Check README
      try {
        moduleInfo.readmeContent = await fs.readFile(readmePath, 'utf8');
        moduleInfo.hasReadme = true;
      } catch (error) {
        console.warn(`No README found for ${moduleName}`);
      }

      return moduleInfo;
    } catch (error) {
      console.error(`Error analyzing module ${moduleName}:`, error);
      return null;
    }
  }

  async generateAllDocs() {
    console.log(`Generating documentation for ${this.modules.length} modules...`);
    
    // Ensure output directory exists
    await fs.mkdir(DOCS_OUTPUT_DIR, { recursive: true });

    for (const module of this.modules) {
      await this.generateModuleDocs(module);
    }

    await this.generateIndexPage();
    console.log('Documentation generation complete!');
  }

  async generateModuleDocs(module) {
    console.log(`Generating docs for ${module.name}...`);
    
    const moduleDocsDir = path.join(DOCS_OUTPUT_DIR, module.name);
    await fs.mkdir(moduleDocsDir, { recursive: true });

    // Generate API Reference
    if (module.hasOpenApi) {
      await this.generateApiReference(module, moduleDocsDir);
    } else {
      // Generate minimal API reference for modules without OpenAPI
      await this.generateMinimalApiReference(module, moduleDocsDir);
    }

    // Generate MCP Tools Documentation
    if (module.hasMcp) {
      await this.generateMcpDocs(module, moduleDocsDir);
    }

    // Generate Deployment Guide
    await this.generateDeploymentGuide(module, moduleDocsDir);

    // Generate Troubleshooting Guide
    await this.generateTroubleshootingGuide(module, moduleDocsDir);

    // Generate Integration Guide
    await this.generateIntegrationGuide(module, moduleDocsDir);

    // Generate Module Overview
    await this.generateModuleOverview(module, moduleDocsDir);
  }

  async generateApiReference(module, outputDir) {
    const template = this.templates['api-reference'];
    const spec = module.openApiSpec;
    
    let content = template
      .replace(/{{MODULE_NAME}}/g, module.name)
      .replace(/{{MODULE_TITLE}}/g, spec.info?.title || module.name)
      .replace(/{{MODULE_DESCRIPTION}}/g, spec.info?.description || '')
      .replace(/{{MODULE_VERSION}}/g, spec.info?.version || '1.0.0');

    // Generate endpoints documentation
    let endpointsDoc = '';
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (typeof operation === 'object' && operation.operationId) {
            endpointsDoc += this.generateEndpointDoc(path, method, operation);
          }
        }
      }
    }
    
    content = content.replace('{{ENDPOINTS_DOCUMENTATION}}', endpointsDoc);

    // Generate schemas documentation
    let schemasDoc = '';
    if (spec.components?.schemas) {
      for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
        schemasDoc += this.generateSchemaDoc(schemaName, schema);
      }
    }
    
    content = content.replace('{{SCHEMAS_DOCUMENTATION}}', schemasDoc);

    await fs.writeFile(path.join(outputDir, 'api-reference.md'), content);
  }

  async generateMinimalApiReference(module, outputDir) {
    const content = `# ${this.getModuleTitle(module)} - API Reference

This module primarily operates through MCP (Model Context Protocol) tools rather than HTTP APIs.

## MCP Integration

This module is designed for serverless and function-based integration. See the [MCP Tools documentation](./mcp-tools.md) for detailed information about available tools.

## Authentication

All MCP tool calls require authentication via sQuid identity:

\`\`\`javascript
const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/${module.name}',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});
\`\`\`

## Standard Headers

When using HTTP endpoints (if any), use standard headers:

- \`x-squid-id\`: sQuid identity ID
- \`x-subid\`: Subidentity ID (optional)
- \`x-qonsent\`: Consent token for permissions
- \`x-sig\`: Qlock signature for verification
- \`x-ts\`: Timestamp
- \`x-api-version\`: API version

## Health Check

Basic health check endpoint (if available):

\`\`\`
GET /health
\`\`\`

Response:
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
\`\`\`

## Error Handling

Standard error response format:

\`\`\`json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "2024-01-01T00:00:00Z"
}
\`\`\`

## Integration

For complete integration examples, see:
- [MCP Tools](./mcp-tools.md) - Function-based integration
- [Integration Guide](./integration-guide.md) - Code examples and patterns
- [Deployment Guide](./deployment-guide.md) - Deployment configurations
`;

    await fs.writeFile(path.join(outputDir, 'api-reference.md'), content);
  }

  generateEndpointDoc(path, method, operation) {
    const methodUpper = method.toUpperCase();
    const summary = operation.summary || '';
    const description = operation.description || '';
    
    let doc = `\n### ${methodUpper} ${path}\n\n`;
    doc += `**${summary}**\n\n`;
    if (description) {
      doc += `${description}\n\n`;
    }

    // Parameters
    if (operation.parameters && operation.parameters.length > 0) {
      doc += `#### Parameters\n\n`;
      for (const param of operation.parameters) {
        doc += `- **${param.name}** (${param.in}): ${param.description || ''}\n`;
        if (param.required) doc += `  - Required: Yes\n`;
        if (param.schema?.type) doc += `  - Type: ${param.schema.type}\n`;
        if (param.schema?.enum) doc += `  - Values: ${param.schema.enum.join(', ')}\n`;
      }
      doc += '\n';
    }

    // Request Body
    if (operation.requestBody) {
      doc += `#### Request Body\n\n`;
      const content = operation.requestBody.content;
      if (content['application/json']?.schema) {
        doc += `Content-Type: application/json\n\n`;
        doc += this.generateSchemaExample(content['application/json'].schema);
      }
    }

    // Responses
    if (operation.responses) {
      doc += `#### Responses\n\n`;
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        doc += `**${statusCode}**: ${response.description || ''}\n\n`;
        if (response.content?.['application/json']?.schema) {
          doc += this.generateSchemaExample(response.content['application/json'].schema);
        }
      }
    }

    return doc;
  }

  generateSchemaDoc(schemaName, schema) {
    let doc = `\n### ${schemaName}\n\n`;
    
    if (schema.description) {
      doc += `${schema.description}\n\n`;
    }

    if (schema.type === 'object' && schema.properties) {
      doc += `#### Properties\n\n`;
      for (const [propName, prop] of Object.entries(schema.properties)) {
        doc += `- **${propName}** (${prop.type || 'any'}): ${prop.description || ''}\n`;
        if (schema.required?.includes(propName)) {
          doc += `  - Required: Yes\n`;
        }
        if (prop.enum) {
          doc += `  - Values: ${prop.enum.join(', ')}\n`;
        }
      }
      doc += '\n';
    }

    return doc;
  }

  generateSchemaExample(schema) {
    if (schema.$ref) {
      return `Schema: ${schema.$ref.split('/').pop()}\n\n`;
    }
    
    if (schema.type === 'object' && schema.properties) {
      let example = '```json\n{\n';
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const exampleValue = this.getExampleValue(prop);
        example += `  "${propName}": ${JSON.stringify(exampleValue)},\n`;
      }
      example = example.slice(0, -2) + '\n}\n```\n\n';
      return example;
    }
    
    return '';
  }

  getExampleValue(prop) {
    if (prop.example !== undefined) return prop.example;
    if (prop.enum) return prop.enum[0];
    
    switch (prop.type) {
      case 'string':
        if (prop.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (prop.format === 'email') return 'user@example.com';
        return 'string';
      case 'integer':
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  async generateMcpDocs(module, outputDir) {
    const template = this.templates['mcp-tools'];
    const spec = module.mcpSpec;
    
    let content = template
      .replace(/{{MODULE_NAME}}/g, module.name)
      .replace(/{{MODULE_DESCRIPTION}}/g, spec.description || '');

    // Generate tools documentation
    let toolsDoc = '';
    if (spec.tools && spec.tools.length > 0) {
      for (const tool of spec.tools) {
        toolsDoc += this.generateToolDoc(tool);
      }
    }
    content = content.replace('{{TOOLS_DOCUMENTATION}}', toolsDoc);

    // Generate resources documentation
    let resourcesDoc = '';
    if (spec.resources && spec.resources.length > 0) {
      resourcesDoc += '\n## Resources\n\n';
      for (const resource of spec.resources) {
        resourcesDoc += `### ${resource.name}\n\n`;
        resourcesDoc += `**URI**: ${resource.uri}\n\n`;
        resourcesDoc += `${resource.description}\n\n`;
      }
    }
    content = content.replace('{{RESOURCES_DOCUMENTATION}}', resourcesDoc);

    // Generate prompts documentation
    let promptsDoc = '';
    if (spec.prompts && spec.prompts.length > 0) {
      promptsDoc += '\n## Prompts\n\n';
      for (const prompt of spec.prompts) {
        promptsDoc += `### ${prompt.name}\n\n`;
        promptsDoc += `${prompt.description}\n\n`;
        if (prompt.arguments && prompt.arguments.length > 0) {
          promptsDoc += '#### Arguments\n\n';
          for (const arg of prompt.arguments) {
            promptsDoc += `- **${arg.name}**: ${arg.description}`;
            if (arg.required) promptsDoc += ' (required)';
            promptsDoc += '\n';
          }
          promptsDoc += '\n';
        }
      }
    }
    content = content.replace('{{PROMPTS_DOCUMENTATION}}', promptsDoc);

    await fs.writeFile(path.join(outputDir, 'mcp-tools.md'), content);
  }

  generateToolDoc(tool) {
    let doc = `\n### ${tool.name}\n\n`;
    doc += `${tool.description}\n\n`;

    // Input Schema
    if (tool.inputSchema) {
      doc += `#### Input\n\n`;
      doc += this.generateJsonSchemaDoc(tool.inputSchema);
    }

    // Output Schema
    if (tool.outputSchema) {
      doc += `#### Output\n\n`;
      doc += this.generateJsonSchemaDoc(tool.outputSchema);
    }

    // Usage Example
    doc += `#### Usage Example\n\n`;
    doc += '```javascript\n';
    doc += `const result = await mcpClient.callTool('${tool.name}', {\n`;
    if (tool.inputSchema?.properties) {
      for (const [propName, prop] of Object.entries(tool.inputSchema.properties)) {
        const exampleValue = this.getExampleValue(prop);
        doc += `  ${propName}: ${JSON.stringify(exampleValue)},\n`;
      }
    }
    doc += '});\n';
    doc += 'console.log(result);\n';
    doc += '```\n\n';

    return doc;
  }

  generateJsonSchemaDoc(schema) {
    let doc = '';
    
    if (schema.type === 'object' && schema.properties) {
      doc += '| Property | Type | Required | Description |\n';
      doc += '|----------|------|----------|-------------|\n';
      
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const type = prop.type || 'any';
        const required = schema.required?.includes(propName) ? 'Yes' : 'No';
        const description = prop.description || '';
        doc += `| ${propName} | ${type} | ${required} | ${description} |\n`;
      }
      doc += '\n';
    }

    return doc;
  }

  async generateDeploymentGuide(module, outputDir) {
    const template = this.templates['deployment-guide'];
    
    let content = template
      .replace(/{{MODULE_NAME}}/g, module.name)
      .replace(/{{MODULE_TITLE}}/g, this.getModuleTitle(module));

    // Add module-specific deployment info
    const deploymentInfo = this.getDeploymentInfo(module);
    content = content.replace('{{DEPLOYMENT_SPECIFIC}}', deploymentInfo);

    await fs.writeFile(path.join(outputDir, 'deployment-guide.md'), content);
  }

  getDeploymentInfo(module) {
    let info = '';
    
    // Check for Docker support
    const hasDockerfile = fsSync.existsSync(path.join(module.path, 'Dockerfile'));
    const hasDockerCompose = fsSync.existsSync(path.join(module.path, 'docker-compose.yml'));
    
    if (hasDockerfile || hasDockerCompose) {
      info += '\n## Docker Deployment\n\n';
      if (hasDockerfile) {
        info += 'This module includes a Dockerfile for containerized deployment.\n\n';
      }
      if (hasDockerCompose) {
        info += 'Use docker-compose for local development:\n\n';
        info += '```bash\ndocker-compose up -d\n```\n\n';
      }
    }

    // Add environment variables from package.json
    if (module.packageInfo?.config?.env) {
      info += '\n## Environment Variables\n\n';
      for (const [key, value] of Object.entries(module.packageInfo.config.env)) {
        info += `- **${key}**: ${value}\n`;
      }
      info += '\n';
    }

    return info;
  } 
 async generateTroubleshootingGuide(module, outputDir) {
    const template = this.templates['troubleshooting'];
    
    let content = template
      .replace(/{{MODULE_NAME}}/g, module.name)
      .replace(/{{MODULE_TITLE}}/g, this.getModuleTitle(module));

    await fs.writeFile(path.join(outputDir, 'troubleshooting.md'), content);
  }

  async generateIntegrationGuide(module, outputDir) {
    const template = this.templates['integration-guide'];
    
    let content = template
      .replace(/{{MODULE_NAME}}/g, module.name)
      .replace(/{{MODULE_TITLE}}/g, this.getModuleTitle(module));

    // Add integration examples
    const integrationExamples = this.generateIntegrationExamples(module);
    content = content.replace('{{INTEGRATION_EXAMPLES}}', integrationExamples);

    await fs.writeFile(path.join(outputDir, 'integration-guide.md'), content);
  }

  generateIntegrationExamples(module) {
    let examples = '';
    
    // HTTP API integration example
    if (module.hasOpenApi) {
      examples += '\n## HTTP API Integration\n\n';
      examples += '```javascript\n';
      examples += `import axios from 'axios';\n\n`;
      examples += `const ${module.name}Client = axios.create({\n`;
      examples += `  baseURL: 'http://localhost:3000/api/${module.name}',\n`;
      examples += `  headers: {\n`;
      examples += `    'x-squid-id': 'your-squid-id',\n`;
      examples += `    'x-api-version': '1.0.0'\n`;
      examples += `  }\n`;
      examples += `});\n\n`;
      examples += `// Example API call\n`;
      examples += `const response = await ${module.name}Client.get('/health');\n`;
      examples += `console.log(response.data);\n`;
      examples += '```\n\n';
    }

    // MCP integration example
    if (module.hasMcp) {
      examples += '\n## MCP Integration\n\n';
      examples += '```javascript\n';
      examples += `import { MCPClient } from '@anarq/mcp-client';\n\n`;
      examples += `const client = new MCPClient({\n`;
      examples += `  serverUrl: 'http://localhost:3000/mcp/${module.name}'\n`;
      examples += `});\n\n`;
      examples += `await client.connect();\n\n`;
      
      if (module.mcpSpec.tools && module.mcpSpec.tools.length > 0) {
        const firstTool = module.mcpSpec.tools[0];
        examples += `// Example tool call\n`;
        examples += `const result = await client.callTool('${firstTool.name}', {\n`;
        if (firstTool.inputSchema?.properties) {
          const props = Object.keys(firstTool.inputSchema.properties).slice(0, 2);
          for (const prop of props) {
            examples += `  ${prop}: 'example-value',\n`;
          }
        }
        examples += `});\n`;
        examples += `console.log(result);\n`;
      }
      examples += '```\n\n';
    }

    return examples;
  }

  getModuleTitle(module) {
    if (module.openApiSpec?.info?.title) {
      return module.openApiSpec.info.title;
    }
    if (module.packageInfo?.description) {
      return module.packageInfo.description;
    }
    return module.name.charAt(0).toUpperCase() + module.name.slice(1);
  }

  async generateModuleOverview(module, outputDir) {
    let content = `# ${this.getModuleTitle(module)}\n\n`;
    
    if (module.openApiSpec?.info?.description) {
      content += `${module.openApiSpec.info.description}\n\n`;
    } else if (module.packageInfo?.description) {
      content += `${module.packageInfo.description}\n\n`;
    }

    content += `## Documentation\n\n`;
    content += `- [API Reference](./api-reference.md) - Complete HTTP API documentation\n`;
    content += `- [MCP Tools](./mcp-tools.md) - Model Context Protocol tools\n`;
    content += `- [Deployment Guide](./deployment-guide.md) - Deployment instructions\n`;
    content += `- [Integration Guide](./integration-guide.md) - Integration examples\n`;
    content += `- [Troubleshooting](./troubleshooting.md) - Common issues and solutions\n\n`;

    // Add quick start
    content += `## Quick Start\n\n`;
    content += `### Standalone Mode\n`;
    content += `\`\`\`bash\n`;
    content += `cd modules/${module.name}\n`;
    content += `npm install\n`;
    content += `npm run dev\n`;
    content += `\`\`\`\n\n`;

    content += `### Docker\n`;
    content += `\`\`\`bash\n`;
    content += `cd modules/${module.name}\n`;
    content += `docker-compose up\n`;
    content += `\`\`\`\n\n`;

    // Add key features
    if (module.hasOpenApi || module.hasMcp) {
      content += `## Key Features\n\n`;
      
      if (module.hasOpenApi && module.openApiSpec.paths) {
        const pathCount = Object.keys(module.openApiSpec.paths).length;
        content += `- **${pathCount} HTTP endpoints** for REST API access\n`;
      }
      
      if (module.hasMcp && module.mcpSpec.tools) {
        const toolCount = module.mcpSpec.tools.length;
        content += `- **${toolCount} MCP tools** for serverless integration\n`;
      }
      
      content += `- **Standalone operation** with mock dependencies\n`;
      content += `- **Full ecosystem integration** with real services\n`;
      content += `- **Comprehensive testing** with 90%+ coverage\n\n`;
    }

    await fs.writeFile(path.join(outputDir, 'README.md'), content);
  }

  async generateIndexPage() {
    let content = `# Q Ecosystem Modules Documentation\n\n`;
    content += `This directory contains comprehensive documentation for all Q ecosystem modules.\n\n`;
    content += `## Available Modules\n\n`;

    for (const module of this.modules) {
      const title = this.getModuleTitle(module);
      content += `### [${title}](./${module.name}/README.md)\n\n`;
      
      if (module.openApiSpec?.info?.description) {
        content += `${module.openApiSpec.info.description}\n\n`;
      } else if (module.packageInfo?.description) {
        content += `${module.packageInfo.description}\n\n`;
      }

      content += `**Documentation:**\n`;
      content += `- [API Reference](./${module.name}/api-reference.md)\n`;
      content += `- [MCP Tools](./${module.name}/mcp-tools.md)\n`;
      content += `- [Deployment Guide](./${module.name}/deployment-guide.md)\n`;
      content += `- [Integration Guide](./${module.name}/integration-guide.md)\n`;
      content += `- [Troubleshooting](./${module.name}/troubleshooting.md)\n\n`;
    }

    content += `## Documentation Standards\n\n`;
    content += `All modules follow standardized documentation structure:\n\n`;
    content += `- **API Reference**: Complete OpenAPI specification with examples\n`;
    content += `- **MCP Tools**: Model Context Protocol tools documentation\n`;
    content += `- **Deployment Guide**: Standalone, integrated, and hybrid deployment modes\n`;
    content += `- **Integration Guide**: Code examples and integration patterns\n`;
    content += `- **Troubleshooting**: Common issues and operational guidance\n\n`;

    await fs.writeFile(path.join(DOCS_OUTPUT_DIR, 'README.md'), content);
  }

  getApiReferenceTemplate() {
    return `# {{MODULE_TITLE}} - API Reference

{{MODULE_DESCRIPTION}}

**Version:** {{MODULE_VERSION}}

## Base URL

- Development: \`http://localhost:3000/api/{{MODULE_NAME}}\`
- Production: \`https://api.q.network/{{MODULE_NAME}}\`

## Authentication

All endpoints require authentication via sQuid identity:

\`\`\`
Authorization: Bearer <jwt-token>
x-squid-id: <squid-identity-id>
x-api-version: 1.0.0
\`\`\`

## Standard Headers

- \`x-squid-id\`: sQuid identity ID
- \`x-subid\`: Subidentity ID (optional)
- \`x-qonsent\`: Consent token for permissions
- \`x-sig\`: Qlock signature for verification
- \`x-ts\`: Timestamp
- \`x-api-version\`: API version

## Standard Response Format

All responses follow this format:

\`\`\`json
{
  "status": "ok|error",
  "code": "SUCCESS|ERROR_CODE",
  "message": "Human readable message",
  "data": {},
  "cid": "ipfs-content-id"
}
\`\`\`

## Endpoints

{{ENDPOINTS_DOCUMENTATION}}

## Data Models

{{SCHEMAS_DOCUMENTATION}}

## Error Codes

Common error codes returned by this module:

- \`INVALID_REQUEST\`: Malformed request
- \`UNAUTHORIZED\`: Authentication required
- \`FORBIDDEN\`: Insufficient permissions
- \`NOT_FOUND\`: Resource not found
- \`RATE_LIMITED\`: Rate limit exceeded
- \`INTERNAL_ERROR\`: Server error

## Rate Limiting

- **Per Identity**: 100 requests per minute
- **Per Subidentity**: 50 requests per minute
- **Per DAO**: 500 requests per minute

Rate limit headers are included in responses:

- \`X-RateLimit-Limit\`: Request limit
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Reset timestamp
`;
  }

  getMcpToolsTemplate() {
    return `# {{MODULE_NAME}} - MCP Tools

{{MODULE_DESCRIPTION}}

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

\`\`\`javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/{{MODULE_NAME}}',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
\`\`\`

## Tools

{{TOOLS_DOCUMENTATION}}

{{RESOURCES_DOCUMENTATION}}

{{PROMPTS_DOCUMENTATION}}

## Error Handling

MCP tools return standardized error responses:

\`\`\`javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
\`\`\`

## Best Practices

1. **Always check success status** before processing results
2. **Handle errors gracefully** with appropriate fallbacks
3. **Use idempotency keys** for write operations
4. **Implement retry logic** with exponential backoff
5. **Cache results** when appropriate to reduce API calls

## Integration Examples

See the [Integration Guide](./integration-guide.md) for complete examples.
`;
  }

  getDeploymentGuideTemplate() {
    return `# {{MODULE_TITLE}} - Deployment Guide

This guide covers deployment options for {{MODULE_NAME}} in different environments.

## Deployment Modes

### Standalone Mode

Standalone mode runs the module with mock dependencies for development and testing.

\`\`\`bash
# Using npm
cd modules/{{MODULE_NAME}}
npm install
npm run dev

# Using Docker
docker-compose up
\`\`\`

**Environment Variables:**
\`\`\`bash
{{MODULE_NAME}}_MODE=standalone
{{MODULE_NAME}}_PORT=3000
LOG_LEVEL=debug
\`\`\`

### Integrated Mode

Integrated mode connects to real ecosystem services for production deployment.

\`\`\`bash
# Set service URLs
export SQUID_API_URL=http://squid:3000
export QONSENT_API_URL=http://qonsent:3000
export QLOCK_API_URL=http://qlock:3000
export QINDEX_API_URL=http://qindex:3000
export QERBEROS_API_URL=http://qerberos:3000

# Start in integrated mode
npm run start:integrated
\`\`\`

### Hybrid Mode

Hybrid mode allows selective mocking for staging environments.

\`\`\`bash
# Configure which services to mock
export MOCK_SERVICES=qlock,qindex
export {{MODULE_NAME}}_MODE=hybrid

npm run start:hybrid
\`\`\`

{{DEPLOYMENT_SPECIFIC}}

## Production Deployment

### Docker Swarm

\`\`\`yaml
version: '3.8'
services:
  {{MODULE_NAME}}:
    image: {{MODULE_NAME}}:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      - {{MODULE_NAME}}_MODE=integrated
      - NODE_ENV=production
    networks:
      - q-network
\`\`\`

### Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{MODULE_NAME}}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: {{MODULE_NAME}}
  template:
    metadata:
      labels:
        app: {{MODULE_NAME}}
    spec:
      containers:
      - name: {{MODULE_NAME}}
        image: {{MODULE_NAME}}:latest
        ports:
        - containerPort: 3000
        env:
        - name: {{MODULE_NAME}}_MODE
          value: "integrated"
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
\`\`\`

## Health Checks

The module provides health check endpoints:

- \`GET /health\` - Basic health check
- \`GET /health/detailed\` - Detailed dependency status

## Monitoring

### Metrics

The module exposes Prometheus metrics at \`/metrics\`:

- Request count and duration
- Error rates
- Dependency health
- Resource usage

### Logging

Structured JSON logging with configurable levels:

\`\`\`bash
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|text
\`\`\`

## Security

### TLS Configuration

\`\`\`bash
# Enable TLS
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
\`\`\`

### Rate Limiting

\`\`\`bash
# Configure rate limits
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX=100       # requests per window
\`\`\`

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common deployment issues.
`;
  }  
getTroubleshootingTemplate() {
    return `# {{MODULE_TITLE}} - Troubleshooting Guide

This guide helps resolve common issues with {{MODULE_NAME}}.

## Common Issues

### Module Won't Start

**Symptoms:**
- Module exits immediately
- Port binding errors
- Dependency connection failures

**Solutions:**

1. **Check port availability:**
   \`\`\`bash
   lsof -i :3000
   # Kill process if needed
   kill -9 <PID>
   \`\`\`

2. **Verify environment variables:**
   \`\`\`bash
   env | grep {{MODULE_NAME}}
   \`\`\`

3. **Check dependency services:**
   \`\`\`bash
   # Test service connectivity
   curl http://localhost:3010/health  # sQuid
   curl http://localhost:3020/health  # Qlock
   \`\`\`

### Authentication Failures

**Symptoms:**
- 401 Unauthorized responses
- Invalid token errors
- sQuid verification failures

**Solutions:**

1. **Verify sQuid ID format:**
   \`\`\`bash
   # Valid format: squid_<base58-encoded-id>
   echo "squid_1A2B3C4D5E6F7G8H9I0J"
   \`\`\`

2. **Check JWT token validity:**
   \`\`\`javascript
   const jwt = require('jsonwebtoken');
   const decoded = jwt.decode(token, { complete: true });
   console.log(decoded);
   \`\`\`

3. **Verify API version header:**
   \`\`\`bash
   curl -H "x-api-version: 1.0.0" http://localhost:3000/health
   \`\`\`

### Permission Denied Errors

**Symptoms:**
- 403 Forbidden responses
- Qonsent permission failures
- DAO access denied

**Solutions:**

1. **Check Qonsent policies:**
   \`\`\`bash
   curl -H "x-squid-id: your-id" \\
        http://qonsent:3000/policies/check
   \`\`\`

2. **Verify DAO membership:**
   \`\`\`bash
   curl -H "x-squid-id: your-id" \\
        http://dao:3000/members/check
   \`\`\`

### Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests
- Requests being throttled
- Slow response times

**Solutions:**

1. **Check rate limit headers:**
   \`\`\`bash
   curl -I http://localhost:3000/api/endpoint
   # Look for X-RateLimit-* headers
   \`\`\`

2. **Implement exponential backoff:**
   \`\`\`javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await new Promise(resolve => 
             setTimeout(resolve, Math.pow(2, i) * 1000)
           );
           continue;
         }
         throw error;
       }
     }
   }
   \`\`\`

### Database Connection Issues

**Symptoms:**
- Database connection timeouts
- Query failures
- Data inconsistency

**Solutions:**

1. **Check database connectivity:**
   \`\`\`bash
   # Test database connection
   nc -zv database-host 5432
   \`\`\`

2. **Verify connection pool settings:**
   \`\`\`bash
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_TIMEOUT=30000
   \`\`\`

### IPFS Integration Issues

**Symptoms:**
- CID resolution failures
- File upload errors
- Pinning failures

**Solutions:**

1. **Check IPFS node status:**
   \`\`\`bash
   curl http://localhost:5001/api/v0/id
   \`\`\`

2. **Verify pinning service:**
   \`\`\`bash
   curl http://localhost:5001/api/v0/pin/ls
   \`\`\`

## Performance Issues

### High Memory Usage

**Diagnosis:**
\`\`\`bash
# Monitor memory usage
docker stats {{MODULE_NAME}}
# or
ps aux | grep {{MODULE_NAME}}
\`\`\`

**Solutions:**
1. Increase container memory limits
2. Implement connection pooling
3. Add garbage collection tuning

### Slow Response Times

**Diagnosis:**
\`\`\`bash
# Check response times
curl -w "@curl-format.txt" http://localhost:3000/api/endpoint
\`\`\`

**Solutions:**
1. Enable response caching
2. Optimize database queries
3. Implement connection keep-alive

## Debugging

### Enable Debug Logging

\`\`\`bash
LOG_LEVEL=debug npm start
\`\`\`

### Health Check Endpoints

\`\`\`bash
# Basic health
curl http://localhost:3000/health

# Detailed health with dependencies
curl http://localhost:3000/health/detailed
\`\`\`

### Metrics and Monitoring

\`\`\`bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Custom debug endpoint
curl http://localhost:3000/debug/status
\`\`\`

## Getting Help

1. **Check logs:** \`docker logs {{MODULE_NAME}}\`
2. **Review documentation:** [API Reference](./api-reference.md)
3. **Test with curl:** Use provided examples
4. **Check GitHub issues:** Search for similar problems
5. **Contact support:** Include logs and configuration

## Operational Runbooks

### Service Restart Procedure

1. Check current health status
2. Drain connections gracefully
3. Stop service
4. Clear temporary files
5. Start service
6. Verify health checks
7. Resume traffic

### Backup and Recovery

1. **Data backup:**
   \`\`\`bash
   # Backup configuration
   cp -r config/ backup/config-$(date +%Y%m%d)/
   
   # Backup IPFS data
   ipfs repo gc
   tar -czf backup/ipfs-$(date +%Y%m%d).tar.gz ~/.ipfs
   \`\`\`

2. **Recovery procedure:**
   \`\`\`bash
   # Restore configuration
   cp -r backup/config-latest/ config/
   
   # Restore IPFS data
   tar -xzf backup/ipfs-latest.tar.gz -C ~/
   \`\`\`

### Emergency Procedures

1. **Service outage:**
   - Enable maintenance mode
   - Redirect traffic to backup
   - Investigate root cause
   - Apply fix and test
   - Restore normal operation

2. **Data corruption:**
   - Stop write operations
   - Assess damage scope
   - Restore from backup
   - Verify data integrity
   - Resume operations
`;
  }

  getIntegrationGuideTemplate() {
    return `# {{MODULE_TITLE}} - Integration Guide

This guide provides examples and patterns for integrating {{MODULE_NAME}} with other systems.

## Integration Patterns

### HTTP API Integration

The most common integration pattern using REST APIs:

\`\`\`javascript
import axios from 'axios';

class {{MODULE_NAME}}Client {
  constructor(options = {}) {
    this.client = axios.create({
      baseURL: options.baseURL || 'http://localhost:3000/api/{{MODULE_NAME}}',
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '1.0.0',
        ...options.headers
      }
    });

    // Add authentication interceptor
    this.client.interceptors.request.use((config) => {
      if (options.squidId) {
        config.headers['x-squid-id'] = options.squidId;
      }
      if (options.token) {
        config.headers['Authorization'] = \`Bearer \${options.token}\`;
      }
      return config;
    });

    // Add error handling interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Usage
const client = new {{MODULE_NAME}}Client({
  squidId: 'your-squid-id',
  token: 'your-jwt-token'
});

const health = await client.healthCheck();
console.log(health);
\`\`\`

### MCP Integration

For serverless and AI agent integration:

\`\`\`javascript
import { MCPClient } from '@anarq/mcp-client';

class {{MODULE_NAME}}MCPClient {
  constructor(options = {}) {
    this.client = new MCPClient({
      serverUrl: options.serverUrl || 'http://localhost:3000/mcp/{{MODULE_NAME}}',
      authentication: {
        squidId: options.squidId,
        token: options.token
      }
    });
  }

  async connect() {
    await this.client.connect();
    console.log('Connected to {{MODULE_NAME}} MCP server');
  }

  async disconnect() {
    await this.client.disconnect();
  }

  async callTool(toolName, params) {
    try {
      const result = await this.client.callTool(toolName, params);
      if (!result.success) {
        throw new Error(result.error || 'Tool call failed');
      }
      return result;
    } catch (error) {
      console.error(\`Tool call failed: \${toolName}\`, error);
      throw error;
    }
  }
}

// Usage
const mcpClient = new {{MODULE_NAME}}MCPClient({
  squidId: 'your-squid-id',
  token: 'your-jwt-token'
});

await mcpClient.connect();
// Use MCP tools...
await mcpClient.disconnect();
\`\`\`

{{INTEGRATION_EXAMPLES}}

## Event-Driven Integration

Subscribe to module events for real-time updates:

\`\`\`javascript
import { EventBusClient } from '@anarq/event-bus';

const eventBus = new EventBusClient({
  url: 'ws://localhost:3001/events'
});

// Subscribe to module events
eventBus.subscribe('q.{{MODULE_NAME}}.*.v1', (event) => {
  console.log('Received event:', event);
  
  switch (event.type) {
    case 'q.{{MODULE_NAME}}.created.v1':
      handleCreated(event.data);
      break;
    case 'q.{{MODULE_NAME}}.updated.v1':
      handleUpdated(event.data);
      break;
    case 'q.{{MODULE_NAME}}.deleted.v1':
      handleDeleted(event.data);
      break;
  }
});

function handleCreated(data) {
  // Handle creation event
  console.log('Resource created:', data);
}

function handleUpdated(data) {
  // Handle update event
  console.log('Resource updated:', data);
}

function handleDeleted(data) {
  // Handle deletion event
  console.log('Resource deleted:', data);
}
\`\`\`

## Cross-Module Integration

### With sQuid (Identity)

\`\`\`javascript
import { sQuidClient } from '@anarq/squid';
import { {{MODULE_NAME}}Client } from '@anarq/{{MODULE_NAME}}';

// Verify identity before module operations
const identity = await sQuidClient.verifyIdentity(squidId);
if (!identity.valid) {
  throw new Error('Invalid identity');
}

// Use verified identity with module
const client = new {{MODULE_NAME}}Client({
  squidId: identity.squidId,
  token: identity.token
});
\`\`\`

### With Qonsent (Permissions)

\`\`\`javascript
import { QonsentClient } from '@anarq/qonsent';

// Check permissions before operations
const hasPermission = await QonsentClient.check({
  squidId: 'user-squid-id',
  resource: '{{MODULE_NAME}}:resource:123',
  action: 'read'
});

if (!hasPermission) {
  throw new Error('Permission denied');
}

// Proceed with operation
const result = await {{MODULE_NAME}}Client.getResource('123');
\`\`\`

### With Qlock (Encryption)

\`\`\`javascript
import { QlockClient } from '@anarq/qlock';

// Encrypt data before storage
const encryptedData = await QlockClient.encrypt({
  data: sensitiveData,
  squidId: 'user-squid-id',
  purpose: '{{MODULE_NAME}}-storage'
});

// Store encrypted data
await {{MODULE_NAME}}Client.store({
  data: encryptedData,
  metadata: { encrypted: true }
});
\`\`\`

## Error Handling Patterns

### Retry with Exponential Backoff

\`\`\`javascript
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (error.response?.status >= 500 || error.code === 'ECONNRESET') {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(\`Attempt \${attempt} failed, retrying in \${delay}ms...\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
}

// Usage
const result = await retryOperation(async () => {
  return await {{MODULE_NAME}}Client.someOperation();
});
\`\`\`

### Circuit Breaker Pattern

\`\`\`javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker();

const result = await circuitBreaker.call(async () => {
  return await {{MODULE_NAME}}Client.someOperation();
});
\`\`\`

## Testing Integration

### Unit Tests

\`\`\`javascript
import { jest } from '@jest/globals';
import { {{MODULE_NAME}}Client } from '@anarq/{{MODULE_NAME}}';

// Mock the HTTP client
jest.mock('axios');

describe('{{MODULE_NAME}} Integration', () => {
  let client;

  beforeEach(() => {
    client = new {{MODULE_NAME}}Client({
      squidId: 'test-squid-id',
      token: 'test-token'
    });
  });

  test('should handle successful API call', async () => {
    const mockResponse = { data: { status: 'ok', data: {} } };
    axios.get.mockResolvedValue(mockResponse);

    const result = await client.healthCheck();
    expect(result.status).toBe('ok');
  });

  test('should handle API errors', async () => {
    const mockError = new Error('Network error');
    axios.get.mockRejectedValue(mockError);

    await expect(client.healthCheck()).rejects.toThrow('Network error');
  });
});
\`\`\`

### Integration Tests

\`\`\`javascript
import { {{MODULE_NAME}}Client } from '@anarq/{{MODULE_NAME}}';

describe('{{MODULE_NAME}} Integration Tests', () => {
  let client;

  beforeAll(async () => {
    // Start test server
    await startTestServer();
    
    client = new {{MODULE_NAME}}Client({
      baseURL: 'http://localhost:3001/api/{{MODULE_NAME}}',
      squidId: 'test-squid-id',
      token: 'test-token'
    });
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test('should perform end-to-end operation', async () => {
    // Test actual integration
    const health = await client.healthCheck();
    expect(health.status).toBe('ok');
  });
});
\`\`\`

## Best Practices

1. **Always authenticate requests** with valid sQuid identity
2. **Handle errors gracefully** with appropriate fallbacks
3. **Implement retry logic** for transient failures
4. **Use circuit breakers** for external service calls
5. **Cache responses** when appropriate
6. **Monitor integration health** with metrics and alerts
7. **Test integration thoroughly** with unit and integration tests
8. **Follow rate limits** to avoid throttling
9. **Use idempotency keys** for write operations
10. **Log integration events** for debugging and monitoring

## Performance Optimization

### Connection Pooling

\`\`\`javascript
import axios from 'axios';
import { Agent } from 'http';

const client = axios.create({
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5
  })
});
\`\`\`

### Response Caching

\`\`\`javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function cachedRequest(key, requestFn) {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const result = await requestFn();
  cache.set(key, result);
  return result;
}
\`\`\`

### Batch Operations

\`\`\`javascript
// Batch multiple operations together
const operations = [
  { type: 'create', data: data1 },
  { type: 'update', id: 'id1', data: data2 },
  { type: 'delete', id: 'id2' }
];

const results = await {{MODULE_NAME}}Client.batch(operations);
\`\`\`
`;
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting module documentation generation...');
    
    const generator = new ModuleDocGenerator();
    await generator.init();
    await generator.generateAllDocs();
    
    console.log('✅ Documentation generation completed successfully!');
    console.log(`📚 Documentation available at: ${DOCS_OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Documentation generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ModuleDocGenerator };