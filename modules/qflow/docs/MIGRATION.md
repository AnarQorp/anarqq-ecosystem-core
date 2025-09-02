# N8n to Qflow Migration Guide

This guide provides comprehensive instructions for migrating n8n workflows to Qflow, including tools, best practices, and troubleshooting.

## Overview

Qflow provides a complete migration toolkit to help you transition from n8n to the distributed, serverless Qflow automation engine. The migration process includes:

1. **Workflow Import**: Convert n8n JSON workflows to Qflow definitions
2. **Compatibility Layer**: Handle differences between n8n and Qflow execution
3. **Validation**: Comprehensive validation of migrated workflows
4. **Testing**: Automated test generation and execution

## Migration Tools

### 1. N8n Workflow Importer

The `N8nWorkflowImporter` class converts n8n workflow JSON files to Qflow flow definitions.

#### Supported Node Types

| N8n Node Type | Qflow Action | Notes |
|---------------|--------------|-------|
| `n8n-nodes-base.start` | `qflow.trigger.manual` | Manual trigger |
| `n8n-nodes-base.webhook` | `qflow.trigger.webhook` | Webhook trigger |
| `n8n-nodes-base.cron` | `qflow.trigger.schedule` | Scheduled trigger |
| `n8n-nodes-base.httpRequest` | `qflow.action.http` | HTTP requests |
| `n8n-nodes-base.function` | `qflow.action.function` | JavaScript functions |
| `n8n-nodes-base.code` | `qflow.action.wasm` | Code execution |
| `n8n-nodes-base.if` | `qflow.condition.if` | Conditional logic |
| `n8n-nodes-base.switch` | `qflow.condition.switch` | Multi-way branching |
| `n8n-nodes-base.set` | `qflow.action.transform` | Data transformation |
| `n8n-nodes-base.gmail` | `qflow.module.qmail` | Email via Qmail |
| `n8n-nodes-base.slack` | `qflow.module.qchat` | Chat via Qchat |

#### Usage Example

```typescript
import { N8nWorkflowImporter } from '@anarq/qflow';

const importer = new N8nWorkflowImporter({
  owner: 'your-squid-identity',
  daoSubnet: 'your-dao-subnet',
  generateTestCases: true,
  validateCredentials: true
});

const result = await importer.importFromFile('workflow.json');

if (result.success) {
  console.log('Migration successful!');
  console.log('Flow definition:', result.flowDefinition);
  
  if (result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
  }
} else {
  console.error('Migration failed:', result.errors);
}
```

### 2. Compatibility Layer

The `CompatibilityLayer` provides compatibility shims and adapters to ease migration.

#### Features

- **Credential Mapping**: Automatic mapping of n8n credentials to Qflow format
- **Data Format Translation**: Convert between n8n and Qflow data formats
- **N8n Function Wrapper**: Compatibility wrapper for n8n JavaScript functions
- **Legacy Webhook Support**: Handle existing webhook endpoints

#### Usage Example

```typescript
import { CompatibilityLayer } from '@anarq/qflow';

const compatibility = new CompatibilityLayer({
  enableN8nApiEmulation: true,
  enableCredentialMapping: true,
  enableDataFormatTranslation: true
});

// Map credentials
const qflowCredentials = await compatibility.mapCredentials(
  'httpBasicAuth',
  { user: 'username', password: 'password' }
);

// Create function wrapper
const wrappedCode = compatibility.createN8nFunctionWrapper(
  'return items.map(item => ({ ...item.json, processed: true }));'
);
```

### 3. Migration Validator

The `MigrationValidator` provides comprehensive validation of migrated workflows.

#### Validation Types

- **Structural**: Flow structure, connections, cycles
- **Semantic**: Parameter mapping, credential migration
- **Performance**: Execution time, resource requirements
- **Security**: Credential exposure, unsafe operations
- **Compatibility**: N8n feature compatibility

#### Usage Example

```typescript
import { MigrationValidator } from '@anarq/qflow';

const validator = new MigrationValidator({
  enableStructuralValidation: true,
  enableSecurityValidation: true,
  enablePerformanceValidation: true
});

const report = await validator.validateMigration(
  originalN8nWorkflow,
  migratedQflowDefinition,
  migrationResult
);

console.log('Validation passed:', report.overall.passed);
console.log('Score:', report.overall.score);
console.log('Recommendations:', report.recommendations);
```

## CLI Tool

The `qflow-migrate` CLI provides command-line access to migration tools.

### Installation

```bash
npm install -g @anarq/qflow
```

### Commands

#### Import Workflow

```bash
qflow-migrate import workflow.json \
  --output migrated-workflow.json \
  --owner your-squid-identity \
  --dao-subnet your-dao \
  --validate \
  --test
```

#### Validate Migration

```bash
qflow-migrate validate migrated-workflow.json \
  --n8n original-workflow.json \
  --output validation-report.json
```

#### Batch Import

```bash
qflow-migrate batch ./workflows \
  --output ./migrated \
  --pattern "*.json" \
  --validate \
  --continue-on-error
```

#### Check Compatibility

```bash
qflow-migrate check-compatibility workflow.json \
  --output compatibility-report.json
```

#### Generate Configuration

```bash
qflow-migrate init-config \
  --output migration-config.json
```

### Configuration File

Create a `migration-config.json` file to customize migration behavior:

```json
{
  "migration": {
    "preserveNodeIds": false,
    "validateCredentials": true,
    "createCompatibilityLayer": true,
    "generateTestCases": true,
    "owner": "your-squid-identity",
    "daoSubnet": "your-dao-subnet"
  },
  "compatibility": {
    "enableN8nApiEmulation": true,
    "enableLegacyWebhooks": true,
    "enableCredentialMapping": true,
    "enableDataFormatTranslation": true,
    "strictMode": false
  },
  "validation": {
    "enableStructuralValidation": true,
    "enableSemanticValidation": true,
    "enablePerformanceValidation": true,
    "enableSecurityValidation": true,
    "enableCompatibilityValidation": true,
    "strictMode": false,
    "timeoutMs": 30000
  }
}
```

## Migration Process

### Step 1: Preparation

1. **Export n8n workflows** to JSON files
2. **Review workflow complexity** and dependencies
3. **Identify custom nodes** or community nodes
4. **Document credentials** and external integrations

### Step 2: Import and Convert

1. **Run compatibility check**:
   ```bash
   qflow-migrate check-compatibility workflow.json
   ```

2. **Import workflow**:
   ```bash
   qflow-migrate import workflow.json --validate --test
   ```

3. **Review warnings and errors** in the output

### Step 3: Validation

1. **Run comprehensive validation**:
   ```bash
   qflow-migrate validate migrated-workflow.json --n8n workflow.json
   ```

2. **Address validation issues**:
   - Fix structural problems (cycles, unreachable steps)
   - Update security issues (credential exposure)
   - Optimize performance bottlenecks

### Step 4: Testing

1. **Review generated test cases**
2. **Create additional test scenarios**
3. **Run tests**:
   ```bash
   qflow-migrate test migrated-workflow.json --test-suite test-cases.json
   ```

### Step 5: Deployment

1. **Configure credentials** in Qflow
2. **Update webhook URLs** to point to Qflow
3. **Deploy to Qflow** environment
4. **Monitor execution** and performance

## Common Migration Scenarios

### HTTP API Workflows

N8n workflows that primarily use HTTP Request nodes migrate easily:

```json
// N8n HTTP Request Node
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com/data",
    "requestMethod": "POST",
    "body": "{\"key\": \"value\"}"
  }
}
```

Becomes:

```json
// Qflow HTTP Action
{
  "type": "task",
  "action": "qflow.action.http",
  "params": {
    "method": "POST",
    "url": "https://api.example.com/data",
    "body": "{\"key\": \"value\"}"
  }
}
```

### Function Nodes

N8n Function nodes are converted to sandboxed WASM execution:

```javascript
// N8n Function Code
return items.map(item => ({
  ...item.json,
  processed: true,
  timestamp: new Date().toISOString()
}));
```

Becomes:

```json
{
  "type": "task",
  "action": "qflow.action.function",
  "params": {
    "code": "// Compatibility wrapper + original code",
    "language": "javascript",
    "sandboxed": true,
    "memoryLimit": "128MB"
  }
}
```

### Webhook Triggers

N8n webhooks become Qflow webhook triggers:

```json
// N8n Webhook
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "my-webhook",
    "httpMethod": "POST"
  }
}
```

Becomes:

```json
// Qflow Webhook Trigger
{
  "type": "event-trigger",
  "action": "qflow.trigger.webhook",
  "params": {
    "path": "my-webhook",
    "method": "POST"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Unsupported Node Types

**Problem**: Community nodes or custom nodes not supported

**Solution**:
- Replace with equivalent HTTP requests
- Create custom WASM functions
- Use Qflow module integrations

#### 2. Credential Migration

**Problem**: Credentials not automatically mapped

**Solution**:
- Manually configure credentials in Qflow
- Use credential mapping configuration
- Update credential references in steps

#### 3. Complex Expressions

**Problem**: N8n expressions not compatible with Qflow

**Solution**:
- Simplify expressions
- Move complex logic to function steps
- Use Qflow's expression syntax

#### 4. Performance Issues

**Problem**: Migrated workflow runs slowly

**Solution**:
- Enable parallel execution for independent steps
- Optimize resource limits
- Use caching for repeated operations

### Validation Errors

#### Structural Errors

- **Cyclic Dependencies**: Remove circular references between steps
- **Unreachable Steps**: Ensure all steps are connected to the flow
- **Missing Start Step**: Add a trigger step to start the workflow

#### Security Errors

- **Credential Exposure**: Use secure credential storage
- **Unsafe Operations**: Remove or sandbox dangerous code
- **Sandbox Violations**: Ensure code runs within sandbox constraints

#### Performance Warnings

- **High Memory Usage**: Optimize data processing
- **Long Execution Times**: Break down complex operations
- **Resource Bottlenecks**: Distribute load across steps

## Best Practices

### 1. Incremental Migration

- Start with simple workflows
- Migrate one workflow at a time
- Test thoroughly before moving to production

### 2. Security First

- Review all credential usage
- Validate input data
- Use least-privilege access

### 3. Performance Optimization

- Enable parallel execution where possible
- Use appropriate resource limits
- Monitor execution metrics

### 4. Testing Strategy

- Create comprehensive test cases
- Test with real data
- Validate error handling

### 5. Documentation

- Document migration decisions
- Update workflow documentation
- Create runbooks for operations

## Advanced Features

### Custom Node Mapping

Add custom node type mappings:

```typescript
const importer = new N8nWorkflowImporter({
  customNodeMappings: {
    'n8n-nodes-community.custom': 'qflow.action.custom'
  }
});
```

### Credential Transformation

Define custom credential transformations:

```typescript
const compatibility = new CompatibilityLayer();

compatibility.addCredentialMapping('customAuth', {
  n8nCredentialType: 'customAuth',
  qflowCredentialType: 'custom_auth',
  parameterMapping: { token: 'auth_token' },
  transformFunction: (creds) => ({
    ...creds,
    service: 'custom-service'
  })
});
```

### Custom Validation Rules

Add custom validation rules:

```typescript
const validator = new MigrationValidator();

validator.addCustomValidation('business-logic', (flow) => {
  // Custom validation logic
  return {
    passed: true,
    issues: [],
    metrics: {}
  };
});
```

## Support and Resources

- **Documentation**: [Qflow Migration Docs](https://docs.qflow.anarq.org/migration)
- **Examples**: [Migration Examples Repository](https://github.com/anarq/qflow-migration-examples)
- **Community**: [Qflow Discord](https://discord.gg/qflow)
- **Issues**: [GitHub Issues](https://github.com/anarq/qflow/issues)

## Migration Checklist

- [ ] Export n8n workflows to JSON
- [ ] Run compatibility check
- [ ] Import workflows with validation
- [ ] Address validation issues
- [ ] Configure credentials
- [ ] Update webhook URLs
- [ ] Create test cases
- [ ] Run comprehensive tests
- [ ] Deploy to staging environment
- [ ] Monitor performance
- [ ] Deploy to production
- [ ] Update documentation
- [ ] Train team on Qflow

## Conclusion

The Qflow migration toolkit provides comprehensive tools for transitioning from n8n to Qflow's distributed automation platform. By following this guide and using the provided tools, you can successfully migrate your workflows while maintaining functionality and improving performance, security, and scalability.