# Qflow - Serverless Automation Engine

Qflow is the serverless, distributed automation engine that serves as the universal coherence motor for the entire AnarQ & Q ecosystem. It replaces centralized orchestrators like n8n with a decentralized, multi-tenant execution environment running entirely on QNET nodes.

## Overview

Qflow operates on a peer-to-peer architecture using:
- **QNET nodes** for distributed execution
- **Libp2p Pubsub** for coordination
- **IPFS** for distributed state storage
- **WebAssembly (WASM)** sandboxes for secure execution
- **Universal Validation Pipeline** (Qlock → Qonsent → Qindex → Qerberos) for ecosystem integrity

## Event Schemas

Qflow uses a comprehensive event-driven architecture with versioned schemas for all operations:

### Core Event Types

- **q.qflow.flow.created.v1** - Emitted when a new flow definition is created
- **q.qflow.exec.started.v1** - Emitted when a flow execution begins
- **q.qflow.exec.step.dispatched.v1** - Emitted when a step is dispatched to a QNET node
- **q.qflow.exec.step.completed.v1** - Emitted when a step execution completes
- **q.qflow.exec.completed.v1** - Emitted when a flow execution finishes
- **q.qflow.validation.pipeline.executed.v1** - Emitted when the universal validation pipeline runs
- **q.qflow.external.event.received.v1** - Emitted when external events (webhooks) are received

### Schema Registry

The `SchemaRegistry` class provides:
- **Schema Loading**: Automatic loading of all event schemas
- **Validation**: Strict validation of events against their schemas
- **Versioning**: Support for schema evolution and backward compatibility
- **Event Creation**: Helper methods to create properly structured events

```typescript
import { schemaRegistry } from './src/schemas/SchemaRegistry.js';

// Create a validated event
const event = schemaRegistry.createEvent(
  'q.qflow.flow.created.v1',
  'squid:user123',
  {
    flowId: 'flow-123',
    flowName: 'My Automation Flow',
    flowVersion: '1.0.0',
    owner: 'squid:user123',
    ipfsCid: 'QmFlowDefinition123'
  }
);

// Validate an existing event
const validation = schemaRegistry.validateEvent('q.qflow.flow.created.v1', event);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Event Emitter

The `QflowEventEmitter` integrates with the ecosystem's EventBusService:

```typescript
import { qflowEventEmitter } from './src/events/EventEmitter.js';

// Emit a flow created event
await qflowEventEmitter.emitFlowCreated('squid:user123', {
  flowId: 'flow-123',
  flowName: 'My Flow',
  flowVersion: '1.0.0',
  owner: 'squid:user123',
  ipfsCid: 'QmFlowDef123'
});

// Subscribe to events
await qflowEventEmitter.subscribe('q.qflow.exec.started.v1', async (event) => {
  console.log('Execution started:', event.data.executionId);
});
```

## Architecture Principles

### 1. No Central Server
- All operations run on distributed QNET nodes
- No single point of failure or control
- Peer-to-peer coordination via Libp2p

### 2. Universal Validation Pipeline
- Every operation validated through Qlock → Qonsent → Qindex → Qerberos
- Ensures ecosystem-wide integrity and compliance
- Decoupled component reusable by other modules

### 3. Multi-Tenant DAO Governance
- DAO-based subnets for complete execution isolation
- DAO-specific policies and node approval
- Scalable governance without central authority

### 4. Serverless Sandbox Execution
- WebAssembly (WASM) sandboxes for secure code execution
- Resource limits and security isolation
- DAO-approved code templates only

### 5. Auditable Distributed State
- All state stored in IPFS with cryptographic signatures
- Complete audit trails for compliance
- Resumable execution after interruptions

## Development Status

### ✅ Completed Tasks

#### Task 0.1: Event Catalog and Schema Registry
- ✅ Created versioned event schemas for all Qflow operations
- ✅ Implemented SchemaRegistry with validation and backward compatibility
- ✅ Registered schemas: q.qflow.flow.created.v1, q.qflow.exec.started.v1, etc.
- ✅ Added comprehensive unit tests for schema validation
- ✅ Integrated with ecosystem EventBusService

#### Task 0.2: MCP Tool Discovery Integration
- ✅ Auto-registered 14 Qflow MCP tools with MCPToolDiscoveryService
- ✅ Created tools: qflow.evaluate, qflow.flow.*, qflow.exec.*, qflow.webhook.verify, qflow.policy.update
- ✅ Implemented 8 core capabilities: universal-validation, serverless-execution, flow-management, etc.
- ✅ Added comprehensive unit tests for MCP tool registration
- ✅ Emit q.tools.registry.updated.v1 events on tool registration

#### Task 0.3: Deprecation Management Integration
- ✅ Wired DeprecationManagementService to flows and templates
- ✅ Implemented sunset paths and telemetry for deprecated features
- ✅ Created migration notifications and compatibility warnings
- ✅ Added deprecation status tracking and migration recommendations
- ✅ Integrated with ecosystem deprecation timeline automation

#### Task 1.1: Project Structure and Core Infrastructure
- ✅ Set up TypeScript project with proper module structure
- ✅ Configure build tools, linting, and testing frameworks  
- ✅ Create package.json with ecosystem dependencies
- ✅ Implement basic Flow Definition models and validation
- ✅ Create core Execution Engine with sequential step processing
- ✅ Add comprehensive unit tests with >90% coverage
- ✅ Build system working with successful TypeScript compilation

### 🚧 Next Tasks

## Installation

```bash
cd modules/qflow
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start development server
npm run dev

# Lint code
npm run lint
```

## Testing

The project includes comprehensive unit tests for all components:

```bash
# Run all tests
npm test

# Run specific test file
npm test SchemaRegistry.test.ts

# Run tests in watch mode
npm run test:watch
```

## Integration with Ecosystem

Qflow integrates seamlessly with all AnarQ & Q ecosystem components:

- **sQuid**: Identity management and authentication
- **Qlock**: Encryption and key management
- **Qonsent**: Dynamic permission validation
- **Qindex**: Metadata indexing and discovery
- **Qerberos**: Security and integrity validation
- **QNET**: Distributed node network
- **EventBusService**: Ecosystem-wide event coordination

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[User Guide](./docs/USER_GUIDE.md)** - Complete guide for creating and managing workflows
- **[Training Materials](./docs/TRAINING_MATERIALS.md)** - Tutorials, exercises, and certification paths
- **[Example Workflows](./docs/EXAMPLE_WORKFLOWS.md)** - Real-world workflow examples
- **[Video Tutorial Scripts](./docs/VIDEO_TUTORIAL_SCRIPTS.md)** - Professional training video scripts
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions and troubleshooting
- **[API Documentation](./docs/api/README.md)** - Complete API reference
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Migration Guide](./docs/MIGRATION.md)** - N8n to Qflow migration tools
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Comprehensive problem-solving guide

## Quick Start

1. **Install Qflow**:
   ```bash
   docker run -d --name qflow -p 8080:8080 -p 4001:4001 qflow:latest
   ```

2. **Create your first flow**:
   ```bash
   qflow create hello-world --template basic
   ```

3. **Execute the flow**:
   ```bash
   qflow start hello-world
   ```

4. **Monitor execution**:
   ```bash
   qflow status <execution-id>
   ```

## Contributing

Please follow the ecosystem's coding standards and ensure all tests pass before submitting changes. Each task must include:

- Implementation with comprehensive unit tests (≥90% coverage)
- API updates and JSON schema registration
- Documentation and troubleshooting guides
- Observability (metrics/events/alerts)
- Quality gate validation

## License

MIT License - See LICENSE file for details.