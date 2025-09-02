# Qflow Documentation Automation Pipeline

## Overview

The Qflow Documentation Pipeline is an automated system that integrates with the existing Q ecosystem infrastructure to provide comprehensive documentation automation. It leverages the Qflow coherence layer architecture to ensure reliable, scalable, and maintainable documentation processes.

## Architecture

### Pipeline Steps

The pipeline consists of four main steps, each implemented as a Qflow coherence layer:

1. **Documentation Validation** (`validate`)
   - Runs comprehensive validation checks on all documentation
   - Validates structure, completeness, links, accessibility, and code snippets
   - Uses existing `docs-validator.mjs` infrastructure

2. **Index Regeneration** (`regenerate-index`)
   - Rebuilds the master documentation index
   - Updates cross-references and navigation
   - Uses existing `master-index-builder.mjs` infrastructure

3. **Video Script Generation** (`build-scripts`)
   - Generates video scripts for ecosystem and module presentations
   - Creates bilingual content (English/Spanish)
   - Includes visual cues and production notes

4. **Portal Publishing** (`publish-portal`)
   - Publishes updated documentation to the public portal
   - Handles deployment and rollback scenarios
   - Integrates with existing portal infrastructure

### Event System

The pipeline integrates with the Q ecosystem event bus and responds to:

- `q.docs.updated.v1` - Documentation update events
- `q.*.release.*.v1` - Module release events  
- `q.docs.quality.failed.v1` - Quality failure events

And emits:

- `q.docs.pipeline.started.v1` - Pipeline execution started
- `q.docs.pipeline.completed.v1` - Pipeline completed successfully
- `q.docs.pipeline.failed.v1` - Pipeline execution failed

## Usage

### CLI Interface

The pipeline provides a comprehensive CLI for manual operations:

```bash
# Execute complete pipeline
npm run docs:pipeline:execute

# Execute with specific trigger
npm run docs:pipeline execute --trigger module-release --module qwallet --version 2.1.0

# Run individual steps
npm run docs:pipeline:validate
npm run docs:pipeline:index
npm run docs:pipeline:scripts
npm run docs:pipeline:portal

# Monitor pipeline
npm run docs:pipeline:status
npm run docs:pipeline:health
npm run docs:pipeline:metrics

# Watch for changes
npm run docs:pipeline:watch

# Configuration management
npm run docs:pipeline config --get
npm run docs:pipeline config --set maxRetries=5,rollbackOnFailure=true
```

### API Endpoints

The pipeline exposes REST API endpoints for integration:

```bash
# Execute pipeline
POST /api/docs-pipeline/execute
{
  "trigger": "manual",
  "context": {
    "module": "qwallet",
    "version": "2.1.0"
  }
}

# Get status
GET /api/docs-pipeline/status

# Update configuration
POST /api/docs-pipeline/config
{
  "maxRetries": 5,
  "rollbackOnFailure": true
}

# Execute individual steps
POST /api/docs-pipeline/validate-only
POST /api/docs-pipeline/regenerate-index-only
POST /api/docs-pipeline/build-scripts-only
POST /api/docs-pipeline/publish-portal-only

# Rollback
POST /api/docs-pipeline/rollback/{pipelineId}

# Health check
GET /api/docs-pipeline/health
```

### Programmatic Usage

```javascript
import { QflowDocumentationPipeline } from './backend/services/QflowDocumentationPipeline.mjs';

const pipeline = new QflowDocumentationPipeline();

// Execute complete pipeline
const result = await pipeline.executePipeline({
  trigger: 'documentation-update',
  source: 'my-service',
  files: ['docs/api.md', 'docs/examples.md']
});

// Execute individual steps
const validationResult = await pipeline.validateDocumentation(context);
const indexResult = await pipeline.regenerateIndex(context);
const scriptsResult = await pipeline.buildScripts(context);
const portalResult = await pipeline.publishPortal(context);
```

## CI/CD Integration

### Automatic Setup

The pipeline can auto-detect and configure CI/CD environments:

```bash
# Auto-detect and setup
node scripts/ci-cd-integration.mjs

# Specific platform setup
node scripts/ci-cd-integration.mjs github-actions
node scripts/ci-cd-integration.mjs gitlab-ci
node scripts/ci-cd-integration.mjs jenkins
node scripts/ci-cd-integration.mjs azure-devops
```

### GitHub Actions

The pipeline automatically creates a GitHub Actions workflow:

```yaml
# .github/workflows/docs-pipeline.yml
name: Documentation Pipeline
on:
  push:
    paths: ['docs/**', 'modules/*/README.md', '*.md']
  pull_request:
    paths: ['docs/**', 'modules/*/README.md', '*.md']
  release:
    types: [published]

jobs:
  documentation-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node scripts/ci-cd-integration.mjs github-actions
```

### Webhooks

The pipeline supports webhook integration for external triggers:

```bash
# GitHub webhook
POST /api/docs-pipeline/webhook/github
X-GitHub-Event: push
{
  "ref": "refs/heads/main",
  "commits": [...]
}

# CI/CD webhook
POST /api/docs-pipeline/webhook/ci-cd
{
  "event": "deployment",
  "module": "qwallet",
  "version": "2.1.0",
  "status": "success"
}
```

## Configuration

### Pipeline Configuration

```javascript
{
  maxRetries: 3,                    // Maximum retries per step
  retryDelayMs: 5000,              // Delay between retries
  rollbackOnFailure: true,         // Execute rollback on failure
  publishToPortal: true,           // Publish to documentation portal
  notifyOnFailure: true,           // Send notifications on failure
  validationTimeout: 300000,       // Validation timeout (5 minutes)
  indexGenerationTimeout: 180000,  // Index generation timeout (3 minutes)
  scriptGenerationTimeout: 240000, // Script generation timeout (4 minutes)
  portalPublishTimeout: 120000     // Portal publish timeout (2 minutes)
}
```

### Event Triggers

The pipeline can be triggered by:

- **Manual**: Explicit user or API request
- **Documentation Update**: Changes to documentation files
- **Module Release**: New module version releases
- **Quality Remediation**: Automatic quality issue fixes
- **Scheduled**: Time-based triggers (via external scheduler)

## Rollback System

The pipeline implements comprehensive rollback capabilities:

### Automatic Rollback

- Triggered on pipeline failure (if `rollbackOnFailure: true`)
- Restores previous state for each completed step
- Maintains rollback stack with up to 10 restore points

### Manual Rollback

```bash
# Rollback specific pipeline execution
npm run docs:pipeline rollback --pipeline-id docs-pipeline-123456

# API rollback
POST /api/docs-pipeline/rollback/docs-pipeline-123456
```

### Rollback Points

Each step creates rollback points:

1. **Validation**: No rollback needed (read-only)
2. **Index Generation**: Restores previous index files
3. **Script Generation**: Restores previous script files  
4. **Portal Publishing**: Restores previous portal state

## Monitoring and Observability

### Metrics

The pipeline provides comprehensive metrics:

```javascript
{
  totalExecutions: 150,
  successfulExecutions: 142,
  failedExecutions: 8,
  successRate: 94.7,
  averageExecutionTime: 45000,
  rollbacksExecuted: 3
}
```

### Health Checks

```bash
# CLI health check
npm run docs:pipeline:health

# API health check
GET /api/docs-pipeline/health
```

### Performance Monitoring

- Step-by-step execution timing
- Resource usage tracking
- Bottleneck detection
- Performance regression alerts

## Error Handling and Quality Assurance

### Quality Issue Remediation

The pipeline can automatically fix common issues:

- **Missing Metadata**: Adds default metadata to files
- **Broken Links**: Attempts to fix common link patterns
- **Missing Alt Text**: Adds generic alt text for images

### Error Recovery

- Automatic retry with exponential backoff
- Graceful degradation for non-critical failures
- Comprehensive error reporting and logging

### Validation Rules

- Structure validation (required directories and files)
- Completeness checking (required sections and content)
- Link validation (internal and cross-references)
- Accessibility validation (alt text, headings, contrast)
- Code snippet validation (syntax and executability)
- Metadata validation (required fields and formats)

## Integration with Existing Systems

### Qflow Service Integration

The pipeline leverages the existing Qflow service architecture:

- Each pipeline step is a Qflow coherence layer
- Uses Qflow evaluation for step execution
- Inherits Qflow's retry, timeout, and error handling
- Integrates with Qflow's performance monitoring

### Event Bus Integration

- Subscribes to ecosystem events for automatic triggers
- Publishes pipeline events for external consumption
- Maintains event history and correlation IDs

### Existing Documentation Infrastructure

- Extends `docs-validator.mjs` for validation
- Uses `master-index-builder.mjs` for index generation
- Integrates with existing script generation tools
- Leverages portal deployment infrastructure

## Security Considerations

### Content Security

- Scans for sensitive information before publishing
- Implements content sanitization rules
- Supports content classification (public/partner/internal)
- Validates security compliance before deployment

### Access Control

- Requires authentication for API endpoints
- Implements role-based access for different operations
- Audit logging for all pipeline executions
- Secure handling of credentials and tokens

### Rollback Security

- Validates rollback operations before execution
- Maintains integrity of rollback data
- Prevents unauthorized rollback operations
- Logs all rollback activities for audit

## Troubleshooting

### Common Issues

1. **Validation Failures**
   ```bash
   # Check validation details
   npm run docs:pipeline:validate
   
   # View specific validation errors
   node scripts/docs-validator.mjs validate --verbose
   ```

2. **Index Generation Failures**
   ```bash
   # Regenerate index manually
   npm run docs:pipeline:index
   
   # Check index structure
   npm run docs:index:validate
   ```

3. **Script Generation Issues**
   ```bash
   # Generate scripts manually
   npm run docs:pipeline:scripts
   
   # Check script templates
   node scripts/ScriptGenerator.mjs --validate-templates
   ```

4. **Portal Publishing Problems**
   ```bash
   # Test portal publishing
   npm run docs:pipeline:portal
   
   # Check portal configuration
   node scripts/portal-generator.mjs --validate-config
   ```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
DEBUG=qflow:docs-pipeline npm run docs:pipeline:execute
```

### Log Analysis

Pipeline logs are structured for easy analysis:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "component": "docs-pipeline",
  "pipelineId": "docs-pipeline-123456",
  "step": "validate",
  "message": "Validation completed successfully",
  "duration": 15000,
  "verdict": "ALLOW",
  "confidence": 0.95
}
```

## Performance Optimization

### Caching Strategy

- Validation results cached for unchanged files
- Index generation uses incremental updates
- Script templates cached and reused
- Portal deployment uses differential updates

### Parallel Execution

- Independent steps can run in parallel
- Resource pooling for efficient execution
- Lazy loading of components
- Optimized resource utilization

### Performance Baselines

The pipeline maintains performance baselines:

- Validation: < 5 seconds for typical documentation
- Index Generation: < 3 minutes for complete rebuild
- Script Generation: < 4 minutes for all scripts
- Portal Publishing: < 2 minutes for deployment

## Future Enhancements

### Planned Features

1. **AI-Powered Content Generation**
   - Automatic documentation updates from code changes
   - Intelligent content suggestions
   - Quality improvement recommendations

2. **Advanced Analytics**
   - Documentation usage analytics
   - Content effectiveness metrics
   - User engagement tracking

3. **Multi-Language Support**
   - Automatic translation workflows
   - Language consistency validation
   - Localization management

4. **Enhanced CI/CD Integration**
   - More platform integrations
   - Advanced deployment strategies
   - Automated testing workflows

### Extensibility

The pipeline is designed for extensibility:

- Plugin system for custom steps
- Configurable validation rules
- Custom event handlers
- Extensible rollback strategies

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/anarq/q-ecosystem.git
cd q-ecosystem

# Install dependencies
npm install

# Run tests
npm run test:docs-pipeline

# Start development server
npm run dev
```

### Testing

```bash
# Run pipeline tests
npm run test backend/tests/qflow-docs-pipeline.test.mjs

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Code Style

The pipeline follows the Q ecosystem coding standards:

- ES modules with modern JavaScript
- Comprehensive error handling
- Extensive logging and monitoring
- Security-first design principles

---

For more information, see the [Q Ecosystem Documentation](./README.md) or contact the development team.