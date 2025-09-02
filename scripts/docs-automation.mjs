#!/usr/bin/env node

/**
 * Documentation Automation and Maintenance System
 * Handles automated documentation generation, validation, and updates
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import DocumentationGenerator from './generate-docs.mjs';

class DocumentationAutomation {
  constructor() {
    this.generator = new DocumentationGenerator();
    this.validationErrors = [];
    this.updateLog = [];
  }

  async init() {
    await this.generator.init();
  }

  async validateDocumentation() {
    console.log('🔍 Validating documentation...');
    
    for (const module of this.generator.modules) {
      await this.validateModuleDocumentation(module);
    }

    if (this.validationErrors.length > 0) {
      console.log('\n❌ Documentation validation failed:');
      this.validationErrors.forEach(error => console.log(`  - ${error}`));
      return false;
    }

    console.log('✅ Documentation validation passed');
    return true;
  }

  async validateModuleDocumentation(module) {
    const moduleDocsDir = path.join('docs/modules', module.name);
    
    // Check required documentation files exist
    const requiredFiles = ['deployment.md', 'troubleshooting.md', 'runbook.md', 'examples.md'];
    if (module.hasOpenApi) requiredFiles.push('api.md');
    if (module.hasMcp) requiredFiles.push('mcp.md');

    for (const file of requiredFiles) {
      const filePath = path.join(moduleDocsDir, file);
      try {
        await fs.access(filePath);
      } catch {
        this.validationErrors.push(`Missing ${file} for ${module.name}`);
      }
    }

    // Validate OpenAPI spec if present
    if (module.hasOpenApi) {
      await this.validateOpenApiSpec(module);
    }

    // Validate MCP spec if present
    if (module.hasMcp) {
      await this.validateMcpSpec(module);
    }

    // Check for broken links
    await this.validateDocumentationLinks(moduleDocsDir);
  }

  async validateOpenApiSpec(module) {
    try {
      const specPath = path.join(module.path, 'openapi.yaml');
      // Use swagger-codegen or openapi-generator to validate
      execSync(`npx swagger-codegen-cli validate -i ${specPath}`, { stdio: 'pipe' });
    } catch (error) {
      this.validationErrors.push(`Invalid OpenAPI spec for ${module.name}: ${error.message}`);
    }
  }

  async validateMcpSpec(module) {
    try {
      const mcpPath = path.join(module.path, 'mcp.json');
      const mcpContent = await fs.readFile(mcpPath, 'utf8');
      const mcp = JSON.parse(mcpContent);
      
      // Validate required MCP fields
      if (!mcp.name || !mcp.version || !mcp.tools) {
        this.validationErrors.push(`Invalid MCP spec for ${module.name}: missing required fields`);
      }

      // Validate tool schemas
      if (mcp.tools) {
        const tools = Array.isArray(mcp.tools) ? mcp.tools : Object.entries(mcp.tools);
        
        for (const tool of tools) {
          const toolName = Array.isArray(mcp.tools) ? tool.name : tool[0];
          const toolDef = Array.isArray(mcp.tools) ? tool : tool[1];
          
          if (!toolDef.inputSchema || !toolDef.outputSchema) {
            this.validationErrors.push(`Invalid MCP tool ${toolName} in ${module.name}: missing schemas`);
          }
        }
      }
    } catch (error) {
      this.validationErrors.push(`Invalid MCP spec for ${module.name}: ${error.message}`);
    }
  }

  async validateDocumentationLinks(docsDir) {
    try {
      const files = await fs.readdir(docsDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(docsDir, file), 'utf8');
          const links = content.match(/\[.*?\]\((.*?)\)/g) || [];
          
          for (const link of links) {
            const url = link.match(/\((.*?)\)/)[1];
            if (url.startsWith('http')) {
              // Skip external links for now
              continue;
            }
            
            // Check internal links
            const linkPath = path.resolve(docsDir, url);
            try {
              await fs.access(linkPath);
            } catch {
              this.validationErrors.push(`Broken link in ${file}: ${url}`);
            }
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  async generateAndValidate() {
    console.log('📚 Starting automated documentation generation and validation...');
    
    // Generate documentation
    await this.generator.generateAllDocumentation();
    
    // Validate generated documentation
    const isValid = await this.validateDocumentation();
    
    if (!isValid) {
      throw new Error('Documentation validation failed');
    }

    // Generate additional resources
    await this.generateAdditionalResources();
    
    console.log('✅ Documentation generation and validation completed successfully');
  }

  async generateAdditionalResources() {
    console.log('📋 Generating additional documentation resources...');
    
    // Generate API collection for Postman/Insomnia
    await this.generateApiCollection();
    
    // Generate SDK documentation
    await this.generateSdkDocumentation();
    
    // Generate integration test documentation
    await this.generateTestDocumentation();
    
    // Generate deployment automation docs
    await this.generateDeploymentAutomation();
  }

  async generateApiCollection() {
    const collection = {
      info: {
        name: 'Q Ecosystem API Collection',
        description: 'Complete API collection for all Q ecosystem modules',
        version: '1.0.0'
      },
      item: []
    };

    for (const module of this.generator.modules) {
      if (module.hasOpenApi) {
        const moduleCollection = await this.convertOpenApiToPostman(module);
        collection.item.push(moduleCollection);
      }
    }

    await fs.writeFile(
      'docs/api-collection.json',
      JSON.stringify(collection, null, 2)
    );

    console.log('  ✅ Generated API collection');
  }

  async convertOpenApiToPostman(module) {
    // Simplified conversion - in practice, use openapi-to-postman
    return {
      name: module.name,
      description: module.openApi?.info?.description || '',
      item: Object.entries(module.openApi?.paths || {}).map(([path, methods]) => ({
        name: `${Object.keys(methods)[0].toUpperCase()} ${path}`,
        request: {
          method: Object.keys(methods)[0].toUpperCase(),
          url: `{{baseUrl}}${path}`,
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'x-squid-id', value: '{{squidId}}' }
          ]
        }
      }))
    };
  }

  async generateSdkDocumentation() {
    const sdkDocs = `# Q Ecosystem SDKs

## Available SDKs

${this.generator.modules.map(module => `
### ${this.generator.formatModuleName(module.name)} SDK

**Installation:**
\`\`\`bash
npm install @anarq/${module.name}-client
\`\`\`

**Usage:**
\`\`\`javascript
import { ${this.generator.formatModuleName(module.name)}Client } from '@anarq/${module.name}-client';

const client = new ${this.generator.formatModuleName(module.name)}Client({
  url: 'http://localhost:${this.generator.getDefaultPort(module.name)}',
  squidId: 'your-squid-id'
});
\`\`\`

**Documentation:** [${module.name} SDK Docs](modules/${module.name}/examples.md)
`).join('\n')}

## Common Patterns

### Error Handling
\`\`\`javascript
try {
  const result = await client.someMethod();
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
    // Retry the request
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
\`\`\`

### Authentication
\`\`\`javascript
// All clients support sQuid authentication
const client = new ModuleClient({
  squidId: 'your-squid-id',
  subId: 'optional-subidentity',
  authToken: 'jwt-token'
});
\`\`\`

### Event Handling
\`\`\`javascript
import { EventBus } from '@anarq/event-bus';

const eventBus = new EventBus();
eventBus.subscribe('q.*.*.v1', (event) => {
  console.log('Ecosystem event:', event);
});
\`\`\`
`;

    await fs.writeFile('docs/sdk.md', sdkDocs);
    console.log('  ✅ Generated SDK documentation');
  }

  async generateTestDocumentation() {
    const testDocs = `# Testing Documentation

## Test Categories

### Unit Tests
- **Coverage Target**: 90%+ for critical paths
- **Framework**: Vitest/Jest
- **Location**: \`modules/{module}/tests/unit/\`

### Contract Tests
- **Purpose**: Validate API contracts and schemas
- **Framework**: Pact/Custom contract testing
- **Location**: \`modules/{module}/tests/contract/\`

### Integration Tests
- **Purpose**: Test module interactions
- **Framework**: Vitest with test containers
- **Location**: \`modules/{module}/tests/integration/\`

### End-to-End Tests
- **Purpose**: Complete user workflows
- **Framework**: Playwright/Cypress
- **Location**: \`tests/e2e/\`

## Running Tests

### Individual Module Tests
\`\`\`bash
cd modules/{module}
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:contract      # Contract tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # With coverage report
\`\`\`

### Ecosystem Tests
\`\`\`bash
# Run all module tests
npm run test:all

# Run integration tests across modules
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Generate comprehensive test report
npm run test:report
\`\`\`

## Test Data Management

### Test Fixtures
- **Location**: \`tests/fixtures/\`
- **Format**: JSON files with sample data
- **Usage**: Shared across all test types

### Mock Services
- **Location**: \`tests/mocks/\`
- **Purpose**: Mock external dependencies
- **Configuration**: Environment-based switching

## Continuous Integration

### Test Pipeline
1. **Lint**: Code style and syntax checking
2. **Unit**: Fast unit tests with coverage
3. **Contract**: API contract validation
4. **Integration**: Multi-module testing
5. **E2E**: Complete workflow testing
6. **Security**: Security scanning and validation

### Quality Gates
- Unit test coverage > 90%
- All contract tests pass
- Integration tests pass
- No critical security vulnerabilities
- Performance benchmarks met

## Test Environment Setup

### Local Development
\`\`\`bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm test

# Cleanup
docker-compose -f docker-compose.test.yml down
\`\`\`

### CI/CD Environment
Tests run automatically on:
- Pull requests
- Main branch commits
- Release tags
- Scheduled nightly runs
`;

    await fs.writeFile('docs/testing.md', testDocs);
    console.log('  ✅ Generated testing documentation');
  }

  async generateDeploymentAutomation() {
    const deploymentDocs = `# Deployment Automation

## Deployment Modes

### Standalone Deployment
Each module can be deployed independently with mock dependencies.

\`\`\`bash
# Deploy single module
./scripts/deploy-module.sh qwallet standalone

# Deploy with specific configuration
./scripts/deploy-module.sh qwallet standalone --config staging
\`\`\`

### Integrated Deployment
Full ecosystem deployment with all real services.

\`\`\`bash
# Deploy entire ecosystem
./scripts/deploy-ecosystem.sh integrated

# Deploy specific modules
./scripts/deploy-ecosystem.sh integrated --modules qwallet,qmail,qdrive
\`\`\`

### Hybrid Deployment
Mixed deployment with some real and some mock services.

\`\`\`bash
# Deploy with hybrid configuration
./scripts/deploy-ecosystem.sh hybrid --real-services squid,qonsent --mock-services qlock,qindex
\`\`\`

## Infrastructure as Code

### Terraform Configuration
\`\`\`hcl
# modules/infrastructure/main.tf
module "q_ecosystem" {
  source = "./modules/q-ecosystem"
  
  environment = var.environment
  modules = var.enabled_modules
  
  # Module-specific configuration
  qwallet_config = {
    replicas = 3
    resources = {
      cpu = "500m"
      memory = "1Gi"
    }
  }
}
\`\`\`

### Kubernetes Manifests
\`\`\`yaml
# k8s/qwallet/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qwallet
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qwallet
  template:
    metadata:
      labels:
        app: qwallet
    spec:
      containers:
      - name: qwallet
        image: anarq/qwallet:latest
        ports:
        - containerPort: 3000
        env:
        - name: QWALLET_MODE
          value: "integrated"
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
\`\`\`

## Deployment Scripts

### Module Deployment Script
\`\`\`bash
#!/bin/bash
# scripts/deploy-module.sh

MODULE_NAME=\$1
DEPLOYMENT_MODE=\$2
CONFIG=\${3:-default}

echo "Deploying \$MODULE_NAME in \$DEPLOYMENT_MODE mode..."

# Build and push image
docker build -t anarq/\$MODULE_NAME:latest modules/\$MODULE_NAME
docker push anarq/\$MODULE_NAME:latest

# Deploy to Kubernetes
kubectl apply -f k8s/\$MODULE_NAME/

# Wait for deployment
kubectl rollout status deployment/\$MODULE_NAME

echo "Deployment completed successfully"
\`\`\`

## Monitoring and Alerting

### Health Checks
All deployments include:
- Liveness probes
- Readiness probes
- Startup probes

### Metrics Collection
- Prometheus metrics scraping
- Custom business metrics
- Performance monitoring
- Error tracking

### Alerting Rules
- Service down alerts
- High error rate alerts
- Performance degradation alerts
- Resource usage alerts

## Rollback Procedures

### Automatic Rollback
\`\`\`bash
# Rollback to previous version
kubectl rollout undo deployment/qwallet

# Rollback to specific revision
kubectl rollout undo deployment/qwallet --to-revision=2
\`\`\`

### Manual Rollback
\`\`\`bash
# Emergency rollback script
./scripts/emergency-rollback.sh qwallet

# Verify rollback
./scripts/verify-deployment.sh qwallet
\`\`\`
`;

    await fs.writeFile('docs/deployment-automation.md', deploymentDocs);
    console.log('  ✅ Generated deployment automation documentation');
  }

  async updateDocumentation() {
    console.log('🔄 Checking for documentation updates...');
    
    for (const module of this.generator.modules) {
      const needsUpdate = await this.checkIfModuleNeedsUpdate(module);
      if (needsUpdate) {
        console.log(`  📝 Updating documentation for ${module.name}...`);
        await this.updateModuleDocumentation(module);
        this.updateLog.push(`Updated ${module.name} documentation`);
      }
    }

    if (this.updateLog.length > 0) {
      console.log('\n📋 Documentation updates completed:');
      this.updateLog.forEach(log => console.log(`  - ${log}`));
      
      // Generate update summary
      await this.generateUpdateSummary();
    } else {
      console.log('✅ All documentation is up to date');
    }
  }

  async checkIfModuleNeedsUpdate(module) {
    try {
      // Check if source files are newer than documentation
      const sourceFiles = [
        path.join(module.path, 'openapi.yaml'),
        path.join(module.path, 'mcp.json'),
        path.join(module.path, 'package.json'),
        path.join(module.path, 'README.md')
      ];

      const docFiles = [
        path.join('docs/modules', module.name, 'api.md'),
        path.join('docs/modules', module.name, 'mcp.md'),
        path.join('docs/modules', module.name, 'deployment.md')
      ];

      let latestSourceTime = 0;
      let earliestDocTime = Date.now();

      // Get latest source file modification time
      for (const sourceFile of sourceFiles) {
        try {
          const stat = await fs.stat(sourceFile);
          latestSourceTime = Math.max(latestSourceTime, stat.mtime.getTime());
        } catch {
          // File doesn't exist, skip
        }
      }

      // Get earliest doc file modification time
      for (const docFile of docFiles) {
        try {
          const stat = await fs.stat(docFile);
          earliestDocTime = Math.min(earliestDocTime, stat.mtime.getTime());
        } catch {
          // Doc file doesn't exist, needs update
          return true;
        }
      }

      return latestSourceTime > earliestDocTime;
    } catch (error) {
      console.warn(`Could not check update status for ${module.name}:`, error.message);
      return true; // Assume needs update if we can't check
    }
  }

  async updateModuleDocumentation(module) {
    const moduleDocsDir = path.join('docs/modules', module.name);
    
    // Regenerate documentation for this module
    await fs.mkdir(moduleDocsDir, { recursive: true });

    if (module.hasOpenApi) {
      await this.generator.generateApiDocumentation(module, moduleDocsDir);
    }

    if (module.hasMcp) {
      await this.generator.generateMcpDocumentation(module, moduleDocsDir);
    }

    await this.generator.generateDeploymentGuide(module, moduleDocsDir);
    await this.generator.generateTroubleshootingGuide(module, moduleDocsDir);
    await this.generator.generateOperationalRunbook(module, moduleDocsDir);
    await this.generator.generateIntegrationExamples(module, moduleDocsDir);
  }

  async generateUpdateSummary() {
    const summary = `# Documentation Update Summary

**Date:** ${new Date().toISOString()}

## Updated Modules

${this.updateLog.map(log => `- ${log}`).join('\n')}

## Changes Made

- Regenerated API documentation from OpenAPI specs
- Updated MCP tool documentation from mcp.json files
- Refreshed deployment guides with latest configuration
- Updated troubleshooting guides with recent issues
- Regenerated integration examples

## Validation Results

${this.validationErrors.length === 0 ? '✅ All documentation passed validation' : `❌ ${this.validationErrors.length} validation errors found`}

## Next Steps

1. Review updated documentation for accuracy
2. Test integration examples
3. Update any custom documentation sections
4. Deploy updated documentation to production

---
*Generated automatically by docs-automation.mjs*
`;

    await fs.writeFile('docs/update-summary.md', summary);
  }

  async watchForChanges() {
    console.log('👀 Watching for changes to automatically update documentation...');
    
    const chokidar = await import('chokidar');
    
    const watcher = chokidar.watch([
      'modules/*/openapi.yaml',
      'modules/*/mcp.json',
      'modules/*/package.json',
      'modules/*/README.md'
    ], {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`📝 Detected change in ${filePath}`);
      
      // Extract module name from path
      const moduleName = filePath.split('/')[1];
      const module = this.generator.modules.find(m => m.name === moduleName);
      
      if (module) {
        console.log(`🔄 Updating documentation for ${moduleName}...`);
        await this.updateModuleDocumentation(module);
        console.log(`✅ Updated documentation for ${moduleName}`);
      }
    });

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping documentation watcher...');
      watcher.close();
      process.exit(0);
    });
  }
}

// CLI interface
async function main() {
  const automation = new DocumentationAutomation();
  await automation.init();

  const command = process.argv[2];

  switch (command) {
    case 'generate':
      await automation.generateAndValidate();
      break;
    
    case 'validate':
      const isValid = await automation.validateDocumentation();
      process.exit(isValid ? 0 : 1);
      break;
    
    case 'update':
      await automation.updateDocumentation();
      break;
    
    case 'watch':
      await automation.watchForChanges();
      break;
    
    default:
      console.log(`
Usage: node docs-automation.mjs <command>

Commands:
  generate  - Generate and validate all documentation
  validate  - Validate existing documentation
  update    - Update documentation if source files changed
  watch     - Watch for changes and auto-update documentation

Examples:
  node docs-automation.mjs generate
  node docs-automation.mjs validate
  node docs-automation.mjs update
  node docs-automation.mjs watch
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Documentation automation failed:', error);
    process.exit(1);
  });
}

export default DocumentationAutomation;