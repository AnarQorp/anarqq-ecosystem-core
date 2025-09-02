#!/usr/bin/env node

/**
 * Comprehensive Module Documentation Generator
 * Generates API docs, MCP tool docs, deployment guides, and troubleshooting guides
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const MODULES_DIR = 'modules';
const DOCS_OUTPUT_DIR = 'docs/modules';

class DocumentationGenerator {
  constructor() {
    this.modules = [];
    this.templates = {};
  }

  async init() {
    await this.loadModules();
    await this.loadTemplates();
    await this.ensureOutputDirectory();
  }

  async loadModules() {
    const moduleNames = await fs.readdir(MODULES_DIR);
    
    for (const moduleName of moduleNames) {
      const modulePath = path.join(MODULES_DIR, moduleName);
      const stat = await fs.stat(modulePath);
      
      if (stat.isDirectory()) {
        const moduleInfo = await this.loadModuleInfo(moduleName, modulePath);
        if (moduleInfo) {
          this.modules.push(moduleInfo);
        }
      }
    }
  }

  async loadModuleInfo(name, modulePath) {
    try {
      const packageJsonPath = path.join(modulePath, 'package.json');
      const openApiPath = path.join(modulePath, 'openapi.yaml');
      const mcpJsonPath = path.join(modulePath, 'mcp.json');
      const readmePath = path.join(modulePath, 'README.md');

      const moduleInfo = {
        name,
        path: modulePath,
        hasPackageJson: await this.fileExists(packageJsonPath),
        hasOpenApi: await this.fileExists(openApiPath),
        hasMcp: await this.fileExists(mcpJsonPath),
        hasReadme: await this.fileExists(readmePath)
      };

      if (moduleInfo.hasPackageJson) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        moduleInfo.packageJson = packageJson;
      }

      if (moduleInfo.hasOpenApi) {
        const openApiContent = await fs.readFile(openApiPath, 'utf8');
        moduleInfo.openApi = yaml.load(openApiContent);
      }

      if (moduleInfo.hasMcp) {
        const mcpContent = await fs.readFile(mcpJsonPath, 'utf8');
        moduleInfo.mcp = JSON.parse(mcpContent);
      }

      return moduleInfo;
    } catch (error) {
      console.warn(`Failed to load module info for ${name}:`, error.message);
      return null;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async loadTemplates() {
    this.templates = {
      apiDoc: await this.loadTemplate('api-documentation.md'),
      mcpDoc: await this.loadTemplate('mcp-documentation.md'),
      deploymentGuide: await this.loadTemplate('deployment-guide.md'),
      troubleshootingGuide: await this.loadTemplate('troubleshooting-guide.md'),
      operationalRunbook: await this.loadTemplate('operational-runbook.md')
    };
  }

  async loadTemplate(templateName) {
    const templatePath = path.join('scripts/templates', templateName);
    if (await this.fileExists(templatePath)) {
      return await fs.readFile(templatePath, 'utf8');
    }
    return this.getDefaultTemplate(templateName);
  }

  getDefaultTemplate(templateName) {
    const templates = {
      'api-documentation.md': `# {{MODULE_NAME}} API Documentation

## Overview
{{MODULE_DESCRIPTION}}

## Base URL
\`{{BASE_URL}}\`

## Authentication
{{AUTH_DESCRIPTION}}

## Endpoints
{{ENDPOINTS}}

## Error Codes
{{ERROR_CODES}}

## Rate Limits
{{RATE_LIMITS}}

## Examples
{{EXAMPLES}}
`,
      'mcp-documentation.md': `# {{MODULE_NAME}} MCP Tools

## Overview
{{MODULE_DESCRIPTION}}

## Available Tools
{{MCP_TOOLS}}

## Usage Examples
{{MCP_EXAMPLES}}

## Integration Guide
{{INTEGRATION_GUIDE}}

## Error Handling
{{ERROR_HANDLING}}
`,
      'deployment-guide.md': `# {{MODULE_NAME}} Deployment Guide

## Overview
{{MODULE_DESCRIPTION}}

## Prerequisites
{{PREREQUISITES}}

## Standalone Mode
{{STANDALONE_DEPLOYMENT}}

## Integrated Mode
{{INTEGRATED_DEPLOYMENT}}

## Hybrid Mode
{{HYBRID_DEPLOYMENT}}

## Configuration
{{CONFIGURATION}}

## Health Checks
{{HEALTH_CHECKS}}

## Monitoring
{{MONITORING}}
`,
      'troubleshooting-guide.md': `# {{MODULE_NAME}} Troubleshooting Guide

## Common Issues
{{COMMON_ISSUES}}

## Error Messages
{{ERROR_MESSAGES}}

## Performance Issues
{{PERFORMANCE_ISSUES}}

## Integration Problems
{{INTEGRATION_PROBLEMS}}

## Debugging Steps
{{DEBUGGING_STEPS}}

## Support Resources
{{SUPPORT_RESOURCES}}
`,
      'operational-runbook.md': `# {{MODULE_NAME}} Operational Runbook

## Service Overview
{{SERVICE_OVERVIEW}}

## Health Monitoring
{{HEALTH_MONITORING}}

## Incident Response
{{INCIDENT_RESPONSE}}

## Maintenance Procedures
{{MAINTENANCE_PROCEDURES}}

## Backup and Recovery
{{BACKUP_RECOVERY}}

## Scaling Procedures
{{SCALING_PROCEDURES}}

## Security Procedures
{{SECURITY_PROCEDURES}}
`
    };
    return templates[templateName] || '';
  }

  async ensureOutputDirectory() {
    await fs.mkdir(DOCS_OUTPUT_DIR, { recursive: true });
  } 
 async generateAllDocumentation() {
    console.log(`Generating documentation for ${this.modules.length} modules...`);

    for (const module of this.modules) {
      console.log(`\nGenerating docs for ${module.name}...`);
      
      const moduleDocsDir = path.join(DOCS_OUTPUT_DIR, module.name);
      await fs.mkdir(moduleDocsDir, { recursive: true });

      // Generate API documentation
      if (module.hasOpenApi) {
        await this.generateApiDocumentation(module, moduleDocsDir);
      }

      // Generate MCP documentation
      if (module.hasMcp) {
        await this.generateMcpDocumentation(module, moduleDocsDir);
      }

      // Generate deployment guide
      await this.generateDeploymentGuide(module, moduleDocsDir);

      // Generate troubleshooting guide
      await this.generateTroubleshootingGuide(module, moduleDocsDir);

      // Generate operational runbook
      await this.generateOperationalRunbook(module, moduleDocsDir);

      // Generate integration examples
      await this.generateIntegrationExamples(module, moduleDocsDir);
    }

    // Generate master index
    await this.generateMasterIndex();
    
    console.log('\nDocumentation generation complete!');
  }

  async generateApiDocumentation(module, outputDir) {
    if (!module.openApi) return;

    const content = this.renderTemplate(this.templates.apiDoc, {
      MODULE_NAME: this.formatModuleName(module.name),
      MODULE_DESCRIPTION: module.openApi.info?.description || `${module.name} API`,
      BASE_URL: module.openApi.servers?.[0]?.url || 'http://localhost:3000',
      AUTH_DESCRIPTION: this.generateAuthDescription(module.openApi),
      ENDPOINTS: this.generateEndpointsDocumentation(module.openApi),
      ERROR_CODES: this.generateErrorCodesDocumentation(module.openApi),
      RATE_LIMITS: this.generateRateLimitsDocumentation(module),
      EXAMPLES: this.generateApiExamples(module.openApi)
    });

    await fs.writeFile(path.join(outputDir, 'api.md'), content);
  }

  async generateMcpDocumentation(module, outputDir) {
    if (!module.mcp) return;

    const content = this.renderTemplate(this.templates.mcpDoc, {
      MODULE_NAME: this.formatModuleName(module.name),
      MODULE_DESCRIPTION: module.mcp.description || `${module.name} MCP Tools`,
      MCP_TOOLS: this.generateMcpToolsDocumentation(module.mcp),
      MCP_EXAMPLES: this.generateMcpExamples(module.mcp),
      INTEGRATION_GUIDE: this.generateMcpIntegrationGuide(module),
      ERROR_HANDLING: this.generateMcpErrorHandling(module.mcp)
    });

    await fs.writeFile(path.join(outputDir, 'mcp.md'), content);
  }

  async generateDeploymentGuide(module, outputDir) {
    const content = this.renderTemplate(this.templates.deploymentGuide, {
      MODULE_NAME: this.formatModuleName(module.name),
      MODULE_DESCRIPTION: this.getModuleDescription(module),
      PREREQUISITES: this.generatePrerequisites(module),
      STANDALONE_DEPLOYMENT: this.generateStandaloneDeployment(module),
      INTEGRATED_DEPLOYMENT: this.generateIntegratedDeployment(module),
      HYBRID_DEPLOYMENT: this.generateHybridDeployment(module),
      CONFIGURATION: this.generateConfigurationDocs(module),
      HEALTH_CHECKS: this.generateHealthChecksDocs(module),
      MONITORING: this.generateMonitoringDocs(module)
    });

    await fs.writeFile(path.join(outputDir, 'deployment.md'), content);
  }

  async generateTroubleshootingGuide(module, outputDir) {
    const content = this.renderTemplate(this.templates.troubleshootingGuide, {
      MODULE_NAME: this.formatModuleName(module.name),
      COMMON_ISSUES: this.generateCommonIssues(module),
      ERROR_MESSAGES: this.generateErrorMessages(module),
      PERFORMANCE_ISSUES: this.generatePerformanceIssues(module),
      INTEGRATION_PROBLEMS: this.generateIntegrationProblems(module),
      DEBUGGING_STEPS: this.generateDebuggingSteps(module),
      SUPPORT_RESOURCES: this.generateSupportResources(module)
    });

    await fs.writeFile(path.join(outputDir, 'troubleshooting.md'), content);
  }

  async generateOperationalRunbook(module, outputDir) {
    const content = this.renderTemplate(this.templates.operationalRunbook, {
      MODULE_NAME: this.formatModuleName(module.name),
      SERVICE_OVERVIEW: this.generateServiceOverview(module),
      HEALTH_MONITORING: this.generateHealthMonitoring(module),
      INCIDENT_RESPONSE: this.generateIncidentResponse(module),
      MAINTENANCE_PROCEDURES: this.generateMaintenanceProcedures(module),
      BACKUP_RECOVERY: this.generateBackupRecovery(module),
      SCALING_PROCEDURES: this.generateScalingProcedures(module),
      SECURITY_PROCEDURES: this.generateSecurityProcedures(module)
    });

    await fs.writeFile(path.join(outputDir, 'runbook.md'), content);
  }

  async generateIntegrationExamples(module, outputDir) {
    const examples = [];

    // HTTP API examples
    if (module.hasOpenApi) {
      examples.push(this.generateHttpIntegrationExamples(module));
    }

    // MCP examples
    if (module.hasMcp) {
      examples.push(this.generateMcpIntegrationExamples(module));
    }

    // Cross-module integration examples
    examples.push(this.generateCrossModuleExamples(module));

    const content = `# ${this.formatModuleName(module.name)} Integration Examples

${examples.join('\n\n')}
`;

    await fs.writeFile(path.join(outputDir, 'examples.md'), content);
  }

  async generateMasterIndex() {
    const indexContent = `# Q Ecosystem Module Documentation

This directory contains comprehensive documentation for all Q ecosystem modules.

## Modules

${this.modules.map(module => `
### ${this.formatModuleName(module.name)}
${this.getModuleDescription(module)}

**Documentation:**
- [API Documentation](${module.name}/api.md)${module.hasMcp ? `
- [MCP Tools](${module.name}/mcp.md)` : ''}
- [Deployment Guide](${module.name}/deployment.md)
- [Troubleshooting](${module.name}/troubleshooting.md)
- [Operational Runbook](${module.name}/runbook.md)
- [Integration Examples](${module.name}/examples.md)

**Status:** ${this.getModuleStatus(module)}
`).join('\n')}

## Quick Start

1. Choose your deployment mode:
   - **Standalone**: Individual module testing and development
   - **Integrated**: Full ecosystem deployment
   - **Hybrid**: Mixed real/mock services for staging

2. Follow the deployment guide for your chosen module
3. Use the troubleshooting guide if you encounter issues
4. Refer to the operational runbook for production operations

## Support

- [General Troubleshooting](../troubleshooting/general.md)
- [Integration Patterns](../integration/patterns.md)
- [Security Guidelines](../security/guidelines.md)
- [Performance Optimization](../performance/optimization.md)
`;

    await fs.writeFile(path.join(DOCS_OUTPUT_DIR, 'README.md'), indexContent);
  }

  // Helper methods for content generation
  renderTemplate(template, variables) {
    let content = template;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return content;
  }

  formatModuleName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  getModuleDescription(module) {
    return module.openApi?.info?.description || 
           module.mcp?.description || 
           module.packageJson?.description || 
           `${this.formatModuleName(module.name)} module for the Q ecosystem`;
  }

  getModuleStatus(module) {
    const hasApi = module.hasOpenApi;
    const hasMcp = module.hasMcp;
    const hasReadme = module.hasReadme;
    
    if (hasApi && hasMcp && hasReadme) return '✅ Complete';
    if (hasApi || hasMcp) return '🟡 Partial';
    return '🔴 Incomplete';
  }

  generateAuthDescription(openApi) {
    const securitySchemes = openApi.components?.securitySchemes;
    if (!securitySchemes) return 'No authentication required';

    const schemes = Object.entries(securitySchemes).map(([name, scheme]) => {
      switch (scheme.type) {
        case 'http':
          return `- **${name}**: ${scheme.scheme} authentication`;
        case 'apiKey':
          return `- **${name}**: API Key in ${scheme.in}`;
        case 'oauth2':
          return `- **${name}**: OAuth2 authentication`;
        default:
          return `- **${name}**: ${scheme.type} authentication`;
      }
    });

    return schemes.join('\n');
  }

  generateEndpointsDocumentation(openApi) {
    if (!openApi.paths) return 'No endpoints defined';

    const endpoints = [];
    for (const [path, methods] of Object.entries(openApi.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === 'object' && operation.operationId) {
          endpoints.push(`
### ${method.toUpperCase()} ${path}
${operation.summary || operation.description || 'No description'}

**Operation ID:** \`${operation.operationId}\`

${operation.parameters ? `**Parameters:**
${operation.parameters.map(p => `- \`${p.name}\` (${p.in}): ${p.description || 'No description'}`).join('\n')}` : ''}

${operation.requestBody ? `**Request Body:**
\`\`\`json
${JSON.stringify(operation.requestBody.content?.['application/json']?.schema || {}, null, 2)}
\`\`\`` : ''}

${operation.responses ? `**Responses:**
${Object.entries(operation.responses).map(([code, response]) => 
  `- **${code}**: ${response.description}`).join('\n')}` : ''}
`);
        }
      }
    }

    return endpoints.join('\n');
  }

  generateErrorCodesDocumentation(openApi) {
    const errorCodes = new Set();
    
    // Extract error codes from responses
    if (openApi.paths) {
      for (const methods of Object.values(openApi.paths)) {
        for (const operation of Object.values(methods)) {
          if (operation.responses) {
            for (const [code, response] of Object.entries(operation.responses)) {
              if (code.startsWith('4') || code.startsWith('5')) {
                errorCodes.add(`- **${code}**: ${response.description}`);
              }
            }
          }
        }
      }
    }

    return errorCodes.size > 0 ? Array.from(errorCodes).join('\n') : 'Standard HTTP error codes apply';
  }

  generateRateLimitsDocumentation(module) {
    return `
- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in \`X-RateLimit-*\` headers
`;
  }

  generateApiExamples(openApi) {
    const examples = [];
    
    // Generate examples for first few endpoints
    if (openApi.paths) {
      const pathEntries = Object.entries(openApi.paths).slice(0, 3);
      
      for (const [path, methods] of pathEntries) {
        for (const [method, operation] of Object.entries(methods)) {
          if (typeof operation === 'object' && operation.operationId) {
            examples.push(`
#### ${operation.summary || `${method.toUpperCase()} ${path}`}

\`\`\`bash
curl -X ${method.toUpperCase()} \\
  "${openApi.servers?.[0]?.url || 'http://localhost:3000'}${path}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN"${operation.requestBody ? ` \\
  -d '${JSON.stringify(this.generateExampleRequestBody(operation.requestBody), null, 2)}'` : ''}
\`\`\`
`);
            break; // Only first method per path
          }
        }
      }
    }

    return examples.join('\n');
  }

  generateExampleRequestBody(requestBody) {
    const schema = requestBody.content?.['application/json']?.schema;
    if (!schema) return {};

    return this.generateExampleFromSchema(schema);
  }

  generateExampleFromSchema(schema) {
    if (!schema) return {};

    switch (schema.type) {
      case 'object':
        const example = {};
        if (schema.properties) {
          for (const [key, prop] of Object.entries(schema.properties)) {
            example[key] = this.generateExampleFromSchema(prop);
          }
        }
        return example;
      case 'array':
        return [this.generateExampleFromSchema(schema.items)];
      case 'string':
        return schema.example || schema.enum?.[0] || 'string';
      case 'number':
      case 'integer':
        return schema.example || 123;
      case 'boolean':
        return schema.example || true;
      default:
        return schema.example || null;
    }
  }

  generateMcpToolsDocumentation(mcp) {
    if (!mcp.tools) return 'No MCP tools defined';

    // Handle both array and object formats
    const tools = Array.isArray(mcp.tools) ? mcp.tools : Object.entries(mcp.tools).map(([name, tool]) => ({ name, ...tool }));

    return tools.map(tool => `
## ${tool.name}

${tool.description}

**Input Schema:**
\`\`\`json
${JSON.stringify(tool.inputSchema, null, 2)}
\`\`\`

**Output Schema:**
\`\`\`json
${JSON.stringify(tool.outputSchema, null, 2)}
\`\`\`
`).join('\n');
  }

  generateMcpExamples(mcp) {
    if (!mcp.tools) return 'No examples available';

    // Handle both array and object formats
    const tools = Array.isArray(mcp.tools) ? mcp.tools : Object.entries(mcp.tools).map(([name, tool]) => ({ name, ...tool }));

    return tools.slice(0, 2).map(tool => `
### ${tool.name} Example

\`\`\`javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('${mcp.name}');

const result = await client.callTool('${tool.name}', ${JSON.stringify(this.generateExampleFromSchema(tool.inputSchema), null, 2)});

console.log(result);
// Expected output structure:
// ${JSON.stringify(this.generateExampleFromSchema(tool.outputSchema), null, 2)}
\`\`\`
`).join('\n');
  }

  generateMcpIntegrationGuide(module) {
    return `
## Installation

\`\`\`bash
npm install @anarq/${module.name}-client
\`\`\`

## Configuration

\`\`\`javascript
import { ${this.formatModuleName(module.name)}Client } from '@anarq/${module.name}-client';

const client = new ${this.formatModuleName(module.name)}Client({
  url: 'http://localhost:${this.getDefaultPort(module.name)}',
  apiKey: process.env.${module.name.toUpperCase()}_API_KEY,
  timeout: 30000
});
\`\`\`

## Error Handling

\`\`\`javascript
try {
  const result = await client.callTool('toolName', params);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'AUTH_FAILED') {
    // Handle authentication failure
  } else {
    // Handle other errors
  }
}
\`\`\`
`;
  }

  generateMcpErrorHandling(mcp) {
    return `
## Common Error Codes

- **INVALID_INPUT**: Input parameters don't match schema
- **AUTH_FAILED**: Authentication or authorization failed
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **SERVICE_UNAVAILABLE**: Service temporarily unavailable
- **TIMEOUT**: Request timed out

## Error Response Format

\`\`\`json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
\`\`\`
`;
  }

  generatePrerequisites(module) {
    return `
## System Requirements

- Node.js 18+ or Docker
- 2GB RAM minimum
- 10GB disk space
- Network access to IPFS (if using storage features)

## Dependencies

${module.hasOpenApi ? '- HTTP client (curl, Postman, etc.)' : ''}
${module.hasMcp ? '- MCP-compatible client' : ''}
- sQuid identity service (for authentication)
- Qonsent permission service (for authorization)

## Environment Setup

\`\`\`bash
# Clone the repository
git clone https://github.com/anarq/q-ecosystem.git
cd q-ecosystem/modules/${module.name}

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
\`\`\`
`;
  }

  generateStandaloneDeployment(module) {
    return `
## Docker Compose (Recommended)

\`\`\`bash
# Start with mock services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f ${module.name}
\`\`\`

## Manual Deployment

\`\`\`bash
# Set standalone mode
export ${module.name.toUpperCase()}_MODE=standalone

# Start the service
npm run dev

# Or for production
npm start
\`\`\`

## Verification

\`\`\`bash
# Health check
curl http://localhost:${this.getDefaultPort(module.name)}/health

# Test basic functionality
${this.generateBasicTest(module)}
\`\`\`

## Mock Services

In standalone mode, the following services are mocked:
- sQuid (identity verification)
- Qonsent (permission checking)
- Qlock (encryption/signatures)
- Qindex (indexing)
- Qerberos (audit logging)
- IPFS (content storage)
`;
  }

  generateIntegratedDeployment(module) {
    return `
## Prerequisites

Ensure all dependent services are running:
- sQuid identity service
- Qonsent permission service
- Qlock encryption service
- Qindex indexing service
- Qerberos audit service
- IPFS node

## Configuration

\`\`\`bash
# Set integrated mode
export ${module.name.toUpperCase()}_MODE=integrated

# Configure service URLs
export SQUID_API_URL=http://squid:3000
export QONSENT_API_URL=http://qonsent:3000
export QLOCK_API_URL=http://qlock:3000
export QINDEX_API_URL=http://qindex:3000
export QERBEROS_API_URL=http://qerberos:3000
export IPFS_API_URL=http://ipfs:5001
\`\`\`

## Deployment

\`\`\`bash
# Using Docker Compose with ecosystem
docker-compose -f docker-compose.ecosystem.yml up -d

# Or manual start
npm run start:integrated
\`\`\`

## Service Discovery

The module will automatically discover and connect to ecosystem services using:
- Environment variables
- Service discovery (if configured)
- Health checks and retries
`;
  }

  generateHybridDeployment(module) {
    return `
## Use Cases

Hybrid mode is ideal for:
- Staging environments
- Integration testing
- Gradual migration
- Development with partial real services

## Configuration

\`\`\`bash
# Set hybrid mode
export ${module.name.toUpperCase()}_MODE=hybrid

# Configure which services to mock
export MOCK_SERVICES=qlock,qindex
export REAL_SERVICES=squid,qonsent,qerberos

# Service URLs for real services
export SQUID_API_URL=http://staging-squid:3000
export QONSENT_API_URL=http://staging-qonsent:3000
\`\`\`

## Service Selection

Services can be individually configured:
\`\`\`bash
# Mock specific services
export MOCK_SQUID=true
export MOCK_QLOCK=false

# Or use service-specific URLs
export SQUID_API_URL=mock://squid
export QLOCK_API_URL=http://real-qlock:3000
\`\`\`
`;
  }

  generateConfigurationDocs(module) {
    return `
## Environment Variables

### Core Configuration
- \`${module.name.toUpperCase()}_PORT\`: HTTP server port (default: ${this.getDefaultPort(module.name)})
- \`${module.name.toUpperCase()}_MODE\`: Deployment mode (standalone|integrated|hybrid)
- \`${module.name.toUpperCase()}_LOG_LEVEL\`: Logging level (debug|info|warn|error)

### Service URLs (Integrated Mode)
- \`SQUID_API_URL\`: sQuid identity service URL
- \`QONSENT_API_URL\`: Qonsent permission service URL
- \`QLOCK_API_URL\`: Qlock encryption service URL
- \`QINDEX_API_URL\`: Qindex indexing service URL
- \`QERBEROS_API_URL\`: Qerberos audit service URL
- \`IPFS_API_URL\`: IPFS node API URL

### Security
- \`${module.name.toUpperCase()}_JWT_SECRET\`: JWT signing secret
- \`${module.name.toUpperCase()}_ENCRYPTION_KEY\`: Local encryption key
- \`${module.name.toUpperCase()}_API_KEY\`: API authentication key

### Performance
- \`${module.name.toUpperCase()}_RATE_LIMIT_WINDOW\`: Rate limit window (ms)
- \`${module.name.toUpperCase()}_RATE_LIMIT_MAX\`: Max requests per window
- \`${module.name.toUpperCase()}_TIMEOUT\`: Request timeout (ms)
- \`${module.name.toUpperCase()}_MAX_CONNECTIONS\`: Max concurrent connections

## Configuration Files

### config/default.json
\`\`\`json
{
  "server": {
    "port": ${this.getDefaultPort(module.name)},
    "host": "0.0.0.0"
  },
  "services": {
    "squid": {
      "url": "http://localhost:3010",
      "timeout": 5000
    }
  },
  "security": {
    "rateLimiting": {
      "windowMs": 60000,
      "max": 100
    }
  }
}
\`\`\`
`;
  }

  generateHealthChecksDocs(module) {
    return `
## Health Endpoint

\`\`\`bash
curl http://localhost:${this.getDefaultPort(module.name)}/health
\`\`\`

**Response:**
\`\`\`json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "squid": {
      "status": "up",
      "latency": 45,
      "lastCheck": "2024-01-01T00:00:00Z"
    }
  },
  "metrics": {
    "uptime": 3600,
    "requestCount": 1234,
    "errorRate": 0.01,
    "avgResponseTime": 120
  }
}
\`\`\`

## Readiness Check

\`\`\`bash
curl http://localhost:${this.getDefaultPort(module.name)}/ready
\`\`\`

## Liveness Check

\`\`\`bash
curl http://localhost:${this.getDefaultPort(module.name)}/live
\`\`\`

## Kubernetes Health Checks

\`\`\`yaml
livenessProbe:
  httpGet:
    path: /live
    port: ${this.getDefaultPort(module.name)}
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: ${this.getDefaultPort(module.name)}
  initialDelaySeconds: 5
  periodSeconds: 5
\`\`\`
`;
  }

  generateMonitoringDocs(module) {
    return `
## Metrics Endpoint

\`\`\`bash
curl http://localhost:${this.getDefaultPort(module.name)}/metrics
\`\`\`

## Key Metrics

- \`${module.name}_requests_total\`: Total HTTP requests
- \`${module.name}_request_duration_seconds\`: Request duration histogram
- \`${module.name}_errors_total\`: Total errors by type
- \`${module.name}_active_connections\`: Current active connections
- \`${module.name}_queue_depth\`: Current queue depth

## Logging

Logs are structured JSON with the following fields:
\`\`\`json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "info",
  "service": "${module.name}",
  "requestId": "req-123",
  "squidId": "squid-456",
  "message": "Request processed",
  "duration": 120,
  "statusCode": 200
}
\`\`\`

## Alerting Rules

### Critical Alerts
- Service down for > 1 minute
- Error rate > 5% for > 5 minutes
- Response time p99 > 1s for > 5 minutes

### Warning Alerts
- Error rate > 1% for > 10 minutes
- Response time p95 > 500ms for > 10 minutes
- Queue depth > 100 for > 5 minutes
`;
  }

  generateCommonIssues(module) {
    return `
## Service Won't Start

**Symptoms:** Service fails to start or exits immediately

**Causes:**
- Port already in use
- Missing environment variables
- Invalid configuration
- Dependency services unavailable

**Solutions:**
1. Check port availability: \`netstat -tlnp | grep ${this.getDefaultPort(module.name)}\`
2. Verify environment variables: \`env | grep ${module.name.toUpperCase()}\`
3. Check configuration syntax
4. Verify dependency service health

## Authentication Failures

**Symptoms:** 401/403 errors, "AUTH_FAILED" responses

**Causes:**
- Invalid or expired JWT tokens
- sQuid service unavailable
- Incorrect API keys
- Clock synchronization issues

**Solutions:**
1. Verify JWT token validity
2. Check sQuid service health
3. Validate API key configuration
4. Synchronize system clocks

## Performance Issues

**Symptoms:** Slow response times, timeouts

**Causes:**
- High load
- Database connection issues
- Network latency
- Resource constraints

**Solutions:**
1. Check system resources: \`top\`, \`free -h\`
2. Monitor network latency
3. Review database performance
4. Scale horizontally if needed

## Integration Problems

**Symptoms:** Service calls failing, data inconsistencies

**Causes:**
- Service version mismatches
- Network connectivity issues
- Schema validation failures
- Rate limiting

**Solutions:**
1. Verify service versions and compatibility
2. Test network connectivity
3. Validate request/response schemas
4. Check rate limit headers
`;
  }

  generateErrorMessages(module) {
    return `
## HTTP Error Codes

### 400 Bad Request
- **INVALID_INPUT**: Request parameters don't match schema
- **MISSING_REQUIRED_FIELD**: Required field missing from request
- **INVALID_FORMAT**: Field format is incorrect

### 401 Unauthorized
- **AUTH_REQUIRED**: Authentication required but not provided
- **INVALID_TOKEN**: JWT token is invalid or expired
- **SQUID_AUTH_FAILED**: sQuid identity verification failed

### 403 Forbidden
- **QONSENT_DENIED**: Permission denied by Qonsent service
- **INSUFFICIENT_PERMISSIONS**: User lacks required permissions
- **RATE_LIMIT_EXCEEDED**: Rate limit exceeded

### 404 Not Found
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **ENDPOINT_NOT_FOUND**: API endpoint doesn't exist

### 500 Internal Server Error
- **SERVICE_UNAVAILABLE**: Dependent service unavailable
- **DATABASE_ERROR**: Database operation failed
- **ENCRYPTION_FAILED**: Qlock encryption/decryption failed

## Service-Specific Errors

${this.generateServiceSpecificErrors(module)}

## Error Response Format

\`\`\`json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {
    "field": "validation error details"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "req-123",
  "retryable": false,
  "suggestedActions": [
    "Check input parameters",
    "Verify authentication"
  ]
}
\`\`\`
`;
  }

  generateServiceSpecificErrors(module) {
    const errorMap = {
      qwallet: `
- **INSUFFICIENT_FUNDS**: Wallet balance too low
- **PAYMENT_FAILED**: Payment processing failed
- **INVALID_SIGNATURE**: Transaction signature invalid`,
      qmail: `
- **MESSAGE_TOO_LARGE**: Message exceeds size limit
- **RECIPIENT_NOT_FOUND**: Recipient identity not found
- **ENCRYPTION_FAILED**: Message encryption failed`,
      qdrive: `
- **FILE_TOO_LARGE**: File exceeds size limit
- **STORAGE_QUOTA_EXCEEDED**: User storage quota exceeded
- **IPFS_UNAVAILABLE**: IPFS storage unavailable`,
      qchat: `
- **ROOM_NOT_FOUND**: Chat room doesn't exist
- **ROOM_FULL**: Chat room at capacity
- **MESSAGE_BLOCKED**: Message blocked by moderation`
    };

    return errorMap[module.name] || `
- **OPERATION_FAILED**: Generic operation failure
- **VALIDATION_ERROR**: Input validation failed
- **DEPENDENCY_ERROR**: Dependent service error`;
  }

  generatePerformanceIssues(module) {
    return `
## High Latency

**Symptoms:** Response times > 1 second

**Debugging:**
1. Check service metrics: \`curl localhost:${this.getDefaultPort(module.name)}/metrics\`
2. Monitor database queries
3. Check network latency to dependencies
4. Review resource utilization

**Solutions:**
- Enable caching
- Optimize database queries
- Scale horizontally
- Use connection pooling

## Memory Leaks

**Symptoms:** Increasing memory usage over time

**Debugging:**
1. Monitor memory usage: \`ps aux | grep ${module.name}\`
2. Generate heap dumps
3. Profile memory allocation
4. Check for unclosed connections

**Solutions:**
- Restart service periodically
- Fix memory leaks in code
- Tune garbage collection
- Implement connection limits

## High CPU Usage

**Symptoms:** CPU usage consistently > 80%

**Debugging:**
1. Profile CPU usage
2. Check for infinite loops
3. Monitor request patterns
4. Review algorithm efficiency

**Solutions:**
- Optimize algorithms
- Implement rate limiting
- Scale horizontally
- Use async processing
`;
  }

  generateIntegrationProblems(module) {
    return `
## Service Discovery Issues

**Symptoms:** Cannot connect to dependent services

**Solutions:**
1. Verify service URLs in environment variables
2. Check network connectivity: \`telnet service-host port\`
3. Verify DNS resolution
4. Check firewall rules

## Schema Validation Failures

**Symptoms:** Requests rejected with validation errors

**Solutions:**
1. Verify request schema against OpenAPI/MCP specs
2. Check data types and formats
3. Validate required fields
4. Review API version compatibility

## Authentication Chain Issues

**Symptoms:** Authentication works individually but fails in integration

**Solutions:**
1. Verify token propagation between services
2. Check token expiration times
3. Validate service-to-service authentication
4. Review permission chains in Qonsent

## Event System Problems

**Symptoms:** Events not being published or consumed

**Solutions:**
1. Check event bus connectivity
2. Verify topic naming conventions
3. Validate event schemas
4. Monitor event processing queues
`;
  }

  generateDebuggingSteps(module) {
    return `
## Step-by-Step Debugging

### 1. Verify Service Health
\`\`\`bash
curl http://localhost:${this.getDefaultPort(module.name)}/health
\`\`\`

### 2. Check Logs
\`\`\`bash
# Docker logs
docker logs ${module.name}

# System logs
journalctl -u ${module.name} -f

# Application logs
tail -f logs/${module.name}.log
\`\`\`

### 3. Test Dependencies
\`\`\`bash
# Test sQuid connection
curl http://squid-service:3000/health

# Test Qonsent connection
curl http://qonsent-service:3000/health
\`\`\`

### 4. Validate Configuration
\`\`\`bash
# Check environment variables
env | grep ${module.name.toUpperCase()}

# Validate configuration file
node -e "console.log(JSON.stringify(require('./config/default.json'), null, 2))"
\`\`\`

### 5. Network Diagnostics
\`\`\`bash
# Check port binding
netstat -tlnp | grep ${this.getDefaultPort(module.name)}

# Test connectivity
telnet localhost ${this.getDefaultPort(module.name)}
\`\`\`

### 6. Performance Analysis
\`\`\`bash
# Monitor resources
top -p \$(pgrep ${module.name})

# Check memory usage
ps aux | grep ${module.name}

# Monitor network
netstat -i
\`\`\`
`;
  }

  generateSupportResources(module) {
    return `
## Documentation
- [API Reference](api.md)
- [MCP Tools](mcp.md)
- [Deployment Guide](deployment.md)
- [Integration Examples](examples.md)

## Community Support
- GitHub Issues: https://github.com/anarq/q-ecosystem/issues
- Discord: https://discord.gg/anarq
- Forum: https://forum.anarq.com

## Professional Support
- Email: support@anarq.com
- Enterprise Support: enterprise@anarq.com

## Monitoring and Alerting
- Grafana Dashboard: http://monitoring.anarq.com/d/${module.name}
- Alert Manager: http://alerts.anarq.com
- Status Page: https://status.anarq.com

## Development Resources
- Source Code: https://github.com/anarq/q-ecosystem/tree/main/modules/${module.name}
- API Playground: https://api.anarq.com/${module.name}/playground
- SDK Documentation: https://docs.anarq.com/sdk/${module.name}
`;
  }

  generateServiceOverview(module) {
    return `
## Service Description
${this.getModuleDescription(module)}

## Key Features
${this.generateKeyFeatures(module)}

## Architecture
- **Type**: ${this.getServiceType(module)}
- **Port**: ${this.getDefaultPort(module.name)}
- **Protocol**: HTTP/REST${module.hasMcp ? ' + MCP' : ''}
- **Database**: ${this.getDatabaseType(module)}
- **Storage**: ${this.getStorageType(module)}

## Dependencies
${this.generateDependencies(module)}

## SLA Targets
- **Availability**: 99.9%
- **Response Time**: p99 < 200ms
- **Error Rate**: < 0.1%
- **Recovery Time**: < 5 minutes
`;
  }

  generateHealthMonitoring(module) {
    return `
## Health Check Endpoints
- \`/health\`: Overall service health
- \`/ready\`: Readiness for traffic
- \`/live\`: Liveness check

## Key Metrics to Monitor
- Request rate and latency
- Error rate by endpoint
- Dependency health status
- Resource utilization (CPU, memory)
- Queue depths and processing times

## Alerting Thresholds
- **Critical**: Service down, error rate > 5%
- **Warning**: High latency, resource usage > 80%
- **Info**: Dependency degradation, queue buildup

## Monitoring Tools
- Prometheus metrics collection
- Grafana dashboards
- AlertManager notifications
- Custom health checks
`;
  }

  generateIncidentResponse(module) {
    return `
## Incident Classification
- **P1**: Service completely down
- **P2**: Major functionality impaired
- **P3**: Minor issues, workarounds available
- **P4**: Cosmetic issues, no user impact

## Response Procedures

### P1 Incidents (Service Down)
1. **Immediate**: Check service status and logs
2. **5 minutes**: Attempt service restart
3. **10 minutes**: Escalate to on-call engineer
4. **15 minutes**: Implement emergency procedures

### P2 Incidents (Major Issues)
1. **Immediate**: Assess impact and scope
2. **15 minutes**: Implement workarounds if available
3. **30 minutes**: Begin root cause analysis
4. **1 hour**: Provide status update

## Emergency Contacts
- On-call Engineer: +1-XXX-XXX-XXXX
- Engineering Manager: +1-XXX-XXX-XXXX
- Operations Team: ops@anarq.com

## Escalation Matrix
1. Service Owner → Engineering Team
2. Engineering Team → Engineering Manager
3. Engineering Manager → CTO
4. CTO → CEO (for critical business impact)
`;
  }

  generateMaintenanceProcedures(module) {
    return `
## Routine Maintenance

### Daily Tasks
- Review service logs for errors
- Check resource utilization trends
- Verify backup completion
- Monitor dependency health

### Weekly Tasks
- Review performance metrics
- Update security patches
- Clean up old logs and data
- Test disaster recovery procedures

### Monthly Tasks
- Capacity planning review
- Security audit
- Dependency updates
- Performance optimization

## Maintenance Windows
- **Preferred**: Sunday 02:00-06:00 UTC
- **Emergency**: Any time with approval
- **Notification**: 48 hours advance notice

## Pre-maintenance Checklist
- [ ] Backup current state
- [ ] Prepare rollback plan
- [ ] Notify stakeholders
- [ ] Verify maintenance window
- [ ] Test in staging environment

## Post-maintenance Checklist
- [ ] Verify service functionality
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Notify completion
`;
  }

  generateBackupRecovery(module) {
    return `
## Backup Strategy

### Data Types
- **Configuration**: Environment variables, config files
- **Application Data**: Database contents, user data
- **Logs**: Application and audit logs
- **Secrets**: Encrypted keys and certificates

### Backup Schedule
- **Real-time**: Critical transactional data
- **Hourly**: Application state and logs
- **Daily**: Full system backup
- **Weekly**: Long-term archive

### Backup Locations
- **Primary**: Local encrypted storage
- **Secondary**: Cloud storage (encrypted)
- **Tertiary**: Offline backup (monthly)

## Recovery Procedures

### Data Recovery
1. Identify data loss scope and timeline
2. Select appropriate backup point
3. Verify backup integrity
4. Restore data to staging environment
5. Validate data consistency
6. Promote to production

### Service Recovery
1. Assess service state and dependencies
2. Restore from last known good state
3. Verify configuration and connections
4. Perform health checks
5. Resume traffic gradually

### Disaster Recovery
1. Activate disaster recovery site
2. Restore from offsite backups
3. Reconfigure DNS and load balancers
4. Validate full system functionality
5. Communicate status to stakeholders

## Recovery Time Objectives
- **RTO**: 15 minutes (maximum downtime)
- **RPO**: 5 minutes (maximum data loss)
- **MTTR**: 10 minutes (mean time to recovery)
`;
  }

  generateScalingProcedures(module) {
    return `
## Scaling Triggers

### Horizontal Scaling (Add Instances)
- CPU usage > 70% for 10 minutes
- Memory usage > 80% for 10 minutes
- Request queue depth > 100
- Response time p95 > 500ms

### Vertical Scaling (Increase Resources)
- Consistent resource constraints
- Memory leaks or fragmentation
- CPU-bound operations
- I/O bottlenecks

## Scaling Procedures

### Manual Scaling
\`\`\`bash
# Scale up
docker-compose up --scale ${module.name}=3

# Kubernetes scaling
kubectl scale deployment ${module.name} --replicas=3

# Verify scaling
kubectl get pods -l app=${module.name}
\`\`\`

### Auto-scaling Configuration
\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${module.name}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${module.name}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
\`\`\`

## Load Testing
\`\`\`bash
# Basic load test
ab -n 1000 -c 10 http://localhost:${this.getDefaultPort(module.name)}/health

# Advanced load test
k6 run --vus 50 --duration 5m load-test.js
\`\`\`
`;
  }

  generateSecurityProcedures(module) {
    return `
## Security Monitoring

### Key Security Metrics
- Failed authentication attempts
- Unusual access patterns
- Privilege escalation attempts
- Data access anomalies

### Security Alerts
- Multiple failed logins
- Access from unusual locations
- Suspicious API usage patterns
- Potential data exfiltration

## Incident Response

### Security Incident Classification
- **Critical**: Active breach, data compromise
- **High**: Attempted breach, vulnerability exploitation
- **Medium**: Suspicious activity, policy violations
- **Low**: Minor security events

### Response Procedures
1. **Immediate**: Isolate affected systems
2. **15 minutes**: Assess scope and impact
3. **30 minutes**: Implement containment measures
4. **1 hour**: Begin forensic analysis
5. **4 hours**: Provide preliminary report

## Security Hardening

### Access Control
- Implement least privilege principles
- Regular access reviews
- Multi-factor authentication
- Role-based permissions

### Network Security
- Firewall configuration
- Network segmentation
- Encrypted communications
- VPN access for remote management

### Data Protection
- Encryption at rest and in transit
- Regular security scans
- Vulnerability assessments
- Penetration testing
`;
  }  
generateHttpIntegrationExamples(module) {
    if (!module.hasOpenApi) return '';

    return `
## HTTP API Integration

### JavaScript/Node.js Example
\`\`\`javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:${this.getDefaultPort(module.name)}',
  headers: {
    'Content-Type': 'application/json',
    'x-squid-id': 'your-squid-id',
    'x-api-version': '1.0'
  }
});

// Example API call
async function example() {
  try {
    const response = await client.get('/health');
    console.log('Service status:', response.data.status);
  } catch (error) {
    console.error('API call failed:', error.response?.data);
  }
}
\`\`\`

### Python Example
\`\`\`python
import requests

class ${this.formatModuleName(module.name)}Client:
    def __init__(self, base_url, squid_id):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'x-squid-id': squid_id,
            'x-api-version': '1.0'
        }
    
    def health_check(self):
        response = requests.get(f"{self.base_url}/health", headers=self.headers)
        return response.json()

# Usage
client = ${this.formatModuleName(module.name)}Client('http://localhost:${this.getDefaultPort(module.name)}', 'your-squid-id')
status = client.health_check()
print(f"Service status: {status['status']}")
\`\`\`
`;
  }

  generateMcpIntegrationExamples(module) {
    if (!module.hasMcp) return '';

    return `
## MCP Integration

### Basic MCP Client
\`\`\`javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  name: '${module.name}',
  version: '1.0.0',
  url: 'http://localhost:${this.getDefaultPort(module.name)}'
});

await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('${module.mcp?.tools?.[0]?.name || 'example'}', {
  // tool parameters
});
console.log('Result:', result);
\`\`\`

### MCP Server Integration
\`\`\`javascript
import { MCPServer } from '@anarq/mcp-server';

const server = new MCPServer({
  name: 'my-integration',
  version: '1.0.0'
});

// Add ${module.name} as a client
server.addClient('${module.name}', {
  url: 'http://localhost:${this.getDefaultPort(module.name)}',
  tools: ['${module.mcp?.tools?.[0]?.name || 'example'}']
});

await server.start();
\`\`\`
`;
  }

  generateCrossModuleExamples(module) {
    return `
## Cross-Module Integration

### Complete Workflow Example
\`\`\`javascript
import { SquidClient } from '@anarq/squid-client';
import { QonsentClient } from '@anarq/qonsent-client';
import { ${this.formatModuleName(module.name)}Client } from '@anarq/${module.name}-client';

async function completeWorkflow() {
  // 1. Authenticate with sQuid
  const squid = new SquidClient();
  const identity = await squid.authenticate('user-credentials');
  
  // 2. Check permissions with Qonsent
  const qonsent = new QonsentClient();
  const hasPermission = await qonsent.check({
    squidId: identity.squidId,
    resource: '${module.name}:action',
    action: 'execute'
  });
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // 3. Execute ${module.name} operation
  const ${module.name} = new ${this.formatModuleName(module.name)}Client();
  const result = await ${module.name}.performOperation({
    squidId: identity.squidId,
    // operation parameters
  });
  
  return result;
}
\`\`\`

### Event-Driven Integration
\`\`\`javascript
import { EventBus } from '@anarq/event-bus';

const eventBus = new EventBus();

// Listen for ${module.name} events
eventBus.subscribe('q.${module.name}.*.v1', (event) => {
  console.log('${this.formatModuleName(module.name)} event:', event);
  
  // React to specific events
  switch (event.type) {
    case 'q.${module.name}.created.v1':
      // Handle creation event
      break;
    case 'q.${module.name}.updated.v1':
      // Handle update event
      break;
  }
});

// Publish events to ${module.name}
eventBus.publish('q.${module.name}.command.v1', {
  squidId: 'user-id',
  action: 'process',
  data: { /* command data */ }
});
\`\`\`
`;
  }  
// Utility methods
  getDefaultPort(moduleName) {
    const portMap = {
      squid: 3010,
      qwallet: 3000,
      qlock: 3020,
      qonsent: 3030,
      qindex: 3040,
      qerberos: 3050,
      qmask: 3060,
      qdrive: 3008,
      qpic: 3070,
      qmarket: 3080,
      qmail: 3090,
      qchat: 3001,
      qnet: 3100,
      dao: 3110
    };
    return portMap[moduleName] || 3000;
  }

  getServiceType(module) {
    if (module.hasMcp && module.hasOpenApi) return 'Hybrid (HTTP + MCP)';
    if (module.hasMcp) return 'MCP Service';
    if (module.hasOpenApi) return 'HTTP REST Service';
    return 'Service';
  }

  getDatabaseType(module) {
    // This could be enhanced to read from actual config
    const dbMap = {
      qwallet: 'PostgreSQL',
      qmail: 'PostgreSQL + IPFS',
      qdrive: 'IPFS + Metadata DB',
      qchat: 'Redis + PostgreSQL',
      dao: 'PostgreSQL'
    };
    return dbMap[module.name] || 'In-memory + IPFS';
  }

  getStorageType(module) {
    const storageMap = {
      qdrive: 'IPFS Primary',
      qpic: 'IPFS Primary',
      qmail: 'IPFS + Local Cache',
      qchat: 'IPFS + Redis'
    };
    return storageMap[module.name] || 'IPFS';
  }

  generateKeyFeatures(module) {
    const featureMap = {
      squid: '- Identity management\n- Subidentity creation\n- Reputation tracking\n- DAO associations',
      qwallet: '- Multi-chain payments\n- Fee calculation\n- Transaction signing\n- Payment intents',
      qlock: '- Encryption/decryption\n- Digital signatures\n- Time-locks\n- Distributed mutex',
      qonsent: '- Permission management\n- UCAN policies\n- Real-time revocation\n- Granular scopes',
      qindex: '- Lightweight indexing\n- Mutable pointers\n- Append-only history\n- Simple queries',
      qerberos: '- Security monitoring\n- Anomaly detection\n- Risk scoring\n- Audit trails',
      qmask: '- Privacy profiles\n- Data anonymization\n- Re-identification prevention\n- GDPR compliance',
      qdrive: '- File storage\n- IPFS integration\n- Access control\n- Data retention',
      qpic: '- Media management\n- Transcoding\n- Optimization\n- Marketplace integration',
      qmarket: '- Content marketplace\n- Licensing\n- Payment processing\n- Revenue distribution',
      qmail: '- Certified messaging\n- End-to-end encryption\n- Delivery receipts\n- Spam filtering',
      qchat: '- Instant messaging\n- Group management\n- Moderation tools\n- Real-time events',
      qnet: '- Network monitoring\n- Node health\n- Latency tracking\n- Capability discovery',
      dao: '- Governance\n- Voting systems\n- Rule enforcement\n- Decision tracking'
    };
    return featureMap[module.name] || '- Core functionality\n- API endpoints\n- Event publishing\n- Health monitoring';
  }

  generateDependencies(module) {
    const baseDeps = [
      '- sQuid (identity verification)',
      '- Qonsent (permission checking)',
      '- Qerberos (audit logging)',
      '- IPFS (content storage)'
    ];

    const specificDeps = {
      qwallet: ['- Qlock (transaction signing)', '- Multi-chain networks'],
      qmail: ['- Qlock (message encryption)', '- Qindex (message indexing)'],
      qdrive: ['- Qlock (file encryption)', '- Qindex (file indexing)', '- Qmask (privacy profiles)'],
      qchat: ['- Qlock (message encryption)', '- WebSocket infrastructure'],
      qmarket: ['- Qwallet (payment processing)', '- Qmask (privacy compliance)']
    };

    const deps = [...baseDeps];
    if (specificDeps[module.name]) {
      deps.push(...specificDeps[module.name]);
    }

    return deps.join('\n');
  }

  generateBasicTest(module) {
    if (module.hasOpenApi) {
      return `curl http://localhost:${this.getDefaultPort(module.name)}/health`;
    }
    return `# Test basic functionality\necho "Service running on port ${this.getDefaultPort(module.name)}"`;
  }
}

// Main execution
async function main() {
  const generator = new DocumentationGenerator();
  
  try {
    await generator.init();
    await generator.generateAllDocumentation();
    console.log('\n✅ Documentation generation completed successfully!');
  } catch (error) {
    console.error('❌ Documentation generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DocumentationGenerator;