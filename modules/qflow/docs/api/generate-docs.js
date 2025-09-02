#!/usr/bin/env node

/**
 * Documentation Generation Script for Qflow API
 * 
 * This script generates comprehensive API documentation including:
 * - OpenAPI specification validation
 * - SDK code examples
 * - Interactive documentation
 * - Postman collection validation
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class QflowDocGenerator {
    constructor() {
        this.docsDir = __dirname;
        this.outputDir = path.join(this.docsDir, 'generated');
    }

    async init() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log('📁 Created output directory');
        } catch (error) {
            console.error('❌ Failed to create output directory:', error.message);
        }
    }

    async validateOpenAPI() {
        try {
            const openApiPath = path.join(this.docsDir, 'openapi.yaml');
            const content = await fs.readFile(openApiPath, 'utf8');
            const spec = yaml.load(content);

            console.log('✅ OpenAPI specification is valid');
            console.log(`📊 Found ${Object.keys(spec.paths).length} endpoints`);
            console.log(`📋 Found ${Object.keys(spec.components.schemas).length} schemas`);

            // Generate endpoint summary
            const endpoints = [];
            for (const [path, methods] of Object.entries(spec.paths)) {
                for (const [method, details] of Object.entries(methods)) {
                    endpoints.push({
                        method: method.toUpperCase(),
                        path,
                        summary: details.summary,
                        tags: details.tags || []
                    });
                }
            }

            await this.generateEndpointSummary(endpoints);
            return spec;
        } catch (error) {
            console.error('❌ OpenAPI validation failed:', error.message);
            throw error;
        }
    }

    async generateEndpointSummary(endpoints) {
        const summary = `# Qflow API Endpoints Summary

Generated on: ${new Date().toISOString()}

## Endpoints by Tag

${this.groupEndpointsByTag(endpoints)}

## All Endpoints

| Method | Path | Summary | Tags |
|--------|------|---------|------|
${endpoints.map(ep => 
    `| ${ep.method} | \`${ep.path}\` | ${ep.summary} | ${ep.tags.join(', ')} |`
).join('\n')}

## Statistics

- **Total Endpoints**: ${endpoints.length}
- **GET Endpoints**: ${endpoints.filter(ep => ep.method === 'GET').length}
- **POST Endpoints**: ${endpoints.filter(ep => ep.method === 'POST').length}
- **PUT Endpoints**: ${endpoints.filter(ep => ep.method === 'PUT').length}
- **DELETE Endpoints**: ${endpoints.filter(ep => ep.method === 'DELETE').length}
`;

        await fs.writeFile(
            path.join(this.outputDir, 'endpoints-summary.md'),
            summary
        );
        console.log('📝 Generated endpoints summary');
    }

    groupEndpointsByTag(endpoints) {
        const grouped = {};
        endpoints.forEach(ep => {
            ep.tags.forEach(tag => {
                if (!grouped[tag]) grouped[tag] = [];
                grouped[tag].push(ep);
            });
        });

        return Object.entries(grouped)
            .map(([tag, eps]) => `### ${tag}\n\n${eps.map(ep => 
                `- **${ep.method}** \`${ep.path}\` - ${ep.summary}`
            ).join('\n')}\n`)
            .join('\n');
    }

    async validatePostmanCollection() {
        try {
            const collectionPath = path.join(this.docsDir, 'postman-collection.json');
            const content = await fs.readFile(collectionPath, 'utf8');
            const collection = JSON.parse(content);

            console.log('✅ Postman collection is valid');
            console.log(`📦 Collection: ${collection.info.name}`);
            console.log(`🔗 Found ${this.countRequests(collection.item)} requests`);

            return collection;
        } catch (error) {
            console.error('❌ Postman collection validation failed:', error.message);
            throw error;
        }
    }

    countRequests(items) {
        let count = 0;
        items.forEach(item => {
            if (item.request) {
                count++;
            } else if (item.item) {
                count += this.countRequests(item.item);
            }
        });
        return count;
    }

    async generateSDKExamples() {
        const examples = {
            javascript: await this.generateJavaScriptExamples(),
            python: await this.generatePythonExamples(),
            curl: await this.generateCurlExamples()
        };

        for (const [lang, content] of Object.entries(examples)) {
            await fs.writeFile(
                path.join(this.outputDir, `examples-${lang}.md`),
                content
            );
        }

        console.log('📚 Generated SDK examples');
    }

    async generateJavaScriptExamples() {
        return `# Qflow JavaScript SDK Examples

## Quick Start

\`\`\`javascript
import { QflowClient } from '@qflow/client';

const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token'
});

// Create a simple flow
const flow = await client.flows.create({
  name: 'Hello World',
  steps: [{
    id: 'hello',
    type: 'task',
    action: 'log-message',
    params: { message: 'Hello, World!' }
  }]
});

// Execute the flow
const execution = await client.executions.start(flow.id);
console.log('Execution started:', execution.executionId);
\`\`\`

## Advanced Examples

### User Registration Flow

\`\`\`javascript
const userFlow = await client.flows.create({
  name: 'User Registration',
  steps: [
    {
      id: 'validate',
      type: 'task',
      action: 'validate-email',
      params: { email: '{{input.email}}' },
      onSuccess: 'create-user'
    },
    {
      id: 'create-user',
      type: 'module-call',
      action: 'user-service.create',
      params: { userData: '{{input}}' },
      onSuccess: 'send-welcome'
    },
    {
      id: 'send-welcome',
      type: 'module-call',
      action: 'qmail.send-email',
      params: {
        template: 'welcome',
        recipient: '{{input.email}}'
      }
    }
  ]
});
\`\`\`

### Real-time Monitoring

\`\`\`javascript
const ws = client.websocket.execution(executionId);

ws.on('status', (update) => {
  console.log('Status:', update.status);
});

ws.on('complete', (result) => {
  console.log('Completed:', result);
});

ws.connect();
\`\`\`
`;
    }

    async generatePythonExamples() {
        return `# Qflow Python SDK Examples

## Quick Start

\`\`\`python
from qflow_client import QflowClient
import asyncio

client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token'
)

async def main():
    # Create a simple flow
    flow = await client.flows.create({
        'name': 'Hello World',
        'steps': [{
            'id': 'hello',
            'type': 'task',
            'action': 'log-message',
            'params': {'message': 'Hello, World!'}
        }]
    })

    # Execute the flow
    execution = await client.executions.start(flow['id'])
    print(f"Execution started: {execution['executionId']}")

asyncio.run(main())
\`\`\`

## Advanced Examples

### Data Processing Pipeline

\`\`\`python
async def create_data_pipeline():
    pipeline = await client.flows.create({
        'name': 'Data Processing Pipeline',
        'steps': [
            {
                'id': 'fetch-data',
                'type': 'task',
                'action': 'fetch-from-api',
                'params': {'url': '{{input.source}}'},
                'onSuccess': 'process-data'
            },
            {
                'id': 'process-data',
                'type': 'parallel',
                'action': 'execute-parallel',
                'params': {
                    'steps': ['validate', 'transform', 'enrich']
                },
                'onSuccess': 'store-data'
            },
            {
                'id': 'store-data',
                'type': 'task',
                'action': 'store-in-database',
                'params': {'data': '{{steps.process-data.output}}'}
            }
        ]
    })
    
    return pipeline
\`\`\`

### Error Handling

\`\`\`python
from qflow_client.exceptions import QflowError, ValidationError

try:
    flow = await client.flows.create(flow_definition)
except ValidationError as e:
    print(f"Validation failed: {e.details}")
except QflowError as e:
    print(f"API error: {e.message}")
\`\`\`
`;
    }

    async generateCurlExamples() {
        return `# Qflow cURL Examples

## Authentication

All requests require a Bearer token:

\`\`\`bash
export QFLOW_TOKEN="your-squid-token"
export QFLOW_API="https://api.qflow.anarq.org/v1"
\`\`\`

## Flow Management

### Create Flow

\`\`\`bash
curl -X POST "$QFLOW_API/flows" \\
  -H "Authorization: Bearer $QFLOW_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Hello World Flow",
    "steps": [{
      "id": "hello",
      "type": "task",
      "action": "log-message",
      "params": {"message": "Hello, World!"}
    }]
  }'
\`\`\`

### List Flows

\`\`\`bash
curl -X GET "$QFLOW_API/flows?limit=20" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

### Get Flow

\`\`\`bash
curl -X GET "$QFLOW_API/flows/{flow-id}" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

## Execution Management

### Start Execution

\`\`\`bash
curl -X POST "$QFLOW_API/flows/{flow-id}/start" \\
  -H "Authorization: Bearer $QFLOW_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inputData": {"user": "developer"},
    "priority": "normal"
  }'
\`\`\`

### Get Execution Status

\`\`\`bash
curl -X GET "$QFLOW_API/executions/{execution-id}" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

### Control Execution

\`\`\`bash
# Pause
curl -X POST "$QFLOW_API/executions/{execution-id}/pause" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"

# Resume
curl -X POST "$QFLOW_API/executions/{execution-id}/resume" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"

# Abort
curl -X POST "$QFLOW_API/executions/{execution-id}/abort" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

## Monitoring

### Get Logs

\`\`\`bash
curl -X GET "$QFLOW_API/executions/{execution-id}/logs?level=info&limit=100" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

### Get Metrics

\`\`\`bash
curl -X GET "$QFLOW_API/executions/{execution-id}/metrics" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

### System Health

\`\`\`bash
curl -X GET "$QFLOW_API/system/health" \\
  -H "Authorization: Bearer $QFLOW_TOKEN"
\`\`\`

## Webhooks

### Trigger Flow via Webhook

\`\`\`bash
curl -X POST "$QFLOW_API/webhooks/{flow-id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: sha256=..." \\
  -d '{
    "eventType": "user.created",
    "data": {"userId": "123", "email": "user@example.com"}
  }'
\`\`\`
`;
    }

    async generateChangelog() {
        const changelog = `# Qflow API Changelog

## v1.0.0 (${new Date().toISOString().split('T')[0]})

### Added
- Initial API release
- Flow management endpoints (CRUD operations)
- Execution control (start, pause, resume, abort)
- Real-time monitoring via WebSocket
- Comprehensive logging and metrics
- External webhook integration
- Multi-tenant DAO support
- Universal validation pipeline integration
- Serverless distributed execution
- Byzantine fault tolerance
- Chaos engineering support

### Security
- sQuid identity authentication
- End-to-end encryption via Qlock
- Dynamic permission validation via Qonsent
- Webhook signature verification
- Rate limiting and DDoS protection

### Performance
- Intelligent node selection
- Adaptive performance optimization
- Caching and pre-warming
- Resource pooling
- Horizontal scaling support

### Documentation
- Complete OpenAPI 3.0 specification
- Interactive Swagger UI documentation
- JavaScript/TypeScript SDK
- Python SDK
- Postman collection
- Comprehensive examples and tutorials

### Ecosystem Integration
- QNET node discovery and management
- IPFS distributed state storage
- Libp2p peer-to-peer coordination
- WebAssembly sandbox execution
- Integration with all AnarQ & Q modules

## Upcoming Features

### v1.1.0 (Planned)
- Visual flow designer
- n8n workflow import tool
- Enhanced monitoring dashboard
- Advanced analytics
- Performance optimization recommendations

### v1.2.0 (Planned)
- Quantum-resistant cryptography
- Advanced AI-powered optimization
- Enhanced chaos engineering
- Multi-cloud deployment support
- Advanced governance features
`;

        await fs.writeFile(
            path.join(this.outputDir, 'CHANGELOG.md'),
            changelog
        );
        console.log('📋 Generated changelog');
    }

    async generateIndex() {
        const index = `# Qflow API Documentation

Welcome to the comprehensive documentation for the Qflow Serverless Automation Engine API.

## 🚀 Quick Start

- [API Overview](./README.md) - Complete API documentation
- [Interactive Documentation](./swagger-ui.html) - Try the API in your browser
- [Postman Collection](./postman-collection.json) - Import into Postman

## 📚 SDK Documentation

- [JavaScript/TypeScript SDK](./sdk-javascript.md) - For Node.js and browser applications
- [Python SDK](./sdk-python.md) - For Python applications

## 📖 Generated Documentation

- [Endpoints Summary](./generated/endpoints-summary.md) - All API endpoints at a glance
- [JavaScript Examples](./generated/examples-javascript.md) - Code examples in JavaScript
- [Python Examples](./generated/examples-python.md) - Code examples in Python
- [cURL Examples](./generated/examples-curl.md) - Command-line examples
- [Changelog](./generated/CHANGELOG.md) - Version history and updates

## 🔧 API Specification

- [OpenAPI Specification](./openapi.yaml) - Machine-readable API specification

## 🎯 Key Features

- **Serverless Architecture**: No central server, runs on distributed QNET nodes
- **Universal Validation**: Integrated Qlock → Qonsent → Qindex → Qerberos pipeline
- **Multi-Tenant**: DAO-based governance and subnet isolation
- **Real-time Monitoring**: WebSocket-based live updates
- **Byzantine Fault Tolerance**: Resilient to malicious nodes
- **Ecosystem Integration**: Seamless integration with all AnarQ & Q modules

## 🛠️ Development Tools

- **Swagger UI**: Interactive API documentation
- **Postman Collection**: Pre-configured API requests
- **SDKs**: Official client libraries for popular languages
- **Examples**: Comprehensive code examples and tutorials

## 📞 Support

- **Documentation**: [https://docs.qflow.anarq.org](https://docs.qflow.anarq.org)
- **GitHub**: [https://github.com/anarq/qflow](https://github.com/anarq/qflow)
- **Community**: [https://community.anarq.org](https://community.anarq.org)
- **Support**: support@anarq.org

---

*Generated on ${new Date().toISOString()}*
`;

        await fs.writeFile(
            path.join(this.docsDir, 'index.md'),
            index
        );
        console.log('📄 Generated documentation index');
    }

    async run() {
        console.log('🚀 Starting Qflow API documentation generation...\n');

        try {
            await this.init();
            await this.validateOpenAPI();
            await this.validatePostmanCollection();
            await this.generateSDKExamples();
            await this.generateChangelog();
            await this.generateIndex();

            console.log('\n✅ Documentation generation completed successfully!');
            console.log(`📁 Output directory: ${this.outputDir}`);
            console.log('🌐 Open swagger-ui.html in a browser to view interactive documentation');
        } catch (error) {
            console.error('\n❌ Documentation generation failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the generator if this script is executed directly
if (require.main === module) {
    const generator = new QflowDocGenerator();
    generator.run();
}

module.exports = QflowDocGenerator;