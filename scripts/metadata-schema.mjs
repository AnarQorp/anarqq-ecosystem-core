#!/usr/bin/env node

/**
 * Document Metadata Schema Definition
 * Defines the standard metadata structure for all Q ecosystem documentation
 */

export const METADATA_SCHEMA = {
  type: 'object',
  required: ['version', 'author', 'lastModified', 'ecosystemVersion', 'category'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Document version following semantic versioning'
    },
    author: {
      type: 'string',
      minLength: 1,
      description: 'Document author or team responsible'
    },
    lastModified: {
      type: 'string',
      format: 'date-time',
      description: 'ISO-8601 timestamp of last modification'
    },
    reviewedBy: {
      type: 'string',
      description: 'Person who last reviewed this document (optional)'
    },
    module: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ],
      description: 'Associated module name (null for global docs)'
    },
    relatedModules: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'List of related modules'
    },
    ecosystemVersion: {
      type: 'string',
      enum: ['v1.0.0', 'v2.0.0'],
      description: 'Q ecosystem version this document applies to'
    },
    lastAudit: {
      type: 'string',
      format: 'date-time',
      description: 'ISO-8601 timestamp of last audit/review'
    },
    category: {
      type: 'string',
      enum: ['global', 'module', 'script', 'technical-analysis', 'runbook', 'api', 'deployment', 'integration'],
      description: 'Document category'
    },
    language: {
      type: 'string',
      enum: ['en', 'es'],
      default: 'en',
      description: 'Document language'
    },
    completeness: {
      type: 'string',
      enum: ['draft', 'review', 'complete'],
      default: 'draft',
      description: 'Document completion status'
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'List of document dependencies'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Document tags for categorization'
    }
  }
};

export const STANDARD_DOCUMENT_TEMPLATE = `---
version: "1.0.0"
author: "Q Ecosystem Team"
lastModified: "${new Date().toISOString()}"
reviewedBy: ""
module: null
relatedModules: []
ecosystemVersion: "v2.0.0"
lastAudit: "${new Date().toISOString()}"
category: "global"
language: "en"
completeness: "draft"
dependencies: []
tags: []
---

# Document Title

## Table of Contents

- [Overview](#overview)
- [Technical Description](#technical-description)
- [Data Flows](#data-flows)
- [Use Cases](#use-cases)
- [Integrations](#integrations)

## Overview

Brief overview of the document content.

## Technical Description

Detailed technical information.

## Data Flows

Description of data flows with diagrams where appropriate.

## Use Cases

Practical use cases and examples.

## Integrations

How this integrates with other modules or systems.
`;

export const MODULE_DOCUMENT_TEMPLATE = `---
version: "1.0.0"
author: "Q Ecosystem Team"
lastModified: "${new Date().toISOString()}"
reviewedBy: ""
module: "MODULE_NAME"
relatedModules: []
ecosystemVersion: "v2.0.0"
lastAudit: "${new Date().toISOString()}"
category: "module"
language: "en"
completeness: "draft"
dependencies: []
tags: ["MODULE_NAME"]
---

# MODULE_NAME Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Use Cases](#use-cases)
- [Integration Patterns](#integration-patterns)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

Brief description of the module's purpose and functionality.

## Architecture

Technical architecture and design patterns.

## API Reference

API endpoints and specifications.

## Data Models

Data structures and schemas.

## Use Cases

Practical examples and scenarios.

## Integration Patterns

How this module integrates with others.

## Deployment

Deployment instructions and configurations.

## Troubleshooting

Common issues and solutions.
`;

export const RUNBOOK_TEMPLATE = `---
version: "1.0.0"
author: "Q Ecosystem Team"
lastModified: "${new Date().toISOString()}"
reviewedBy: ""
module: "MODULE_NAME"
relatedModules: []
ecosystemVersion: "v2.0.0"
lastAudit: "${new Date().toISOString()}"
category: "runbook"
language: "en"
completeness: "draft"
dependencies: []
tags: ["MODULE_NAME", "operations", "runbook"]
---

# MODULE_NAME Operational Runbook

## Module Overview

**Name**: MODULE_NAME
**Description**: Module description
**Version**: 1.0.0

## Health Checks

### Endpoints
- **Basic Health**: \`GET /health\`
- **Detailed Health**: \`GET /health/detailed\`
- **Metrics**: \`GET /metrics\`

## Service Management

### Start Service
\`\`\`bash
# Instructions to start the service
\`\`\`

### Stop Service
\`\`\`bash
# Instructions to stop the service
\`\`\`

## Troubleshooting

### Common Issues

1. **Issue Description**
   - Symptoms
   - Diagnosis steps
   - Resolution

## Monitoring

### Key Metrics
- List of important metrics to monitor

### Alerts
- Alert conditions and thresholds

## Backup and Recovery

### Backup Procedures
- How to backup data and configuration

### Recovery Procedures
- How to restore from backup

## Contact Information

- **Primary Contact**: team@q.network
- **On-Call**: emergency contact
- **Escalation**: escalation contact
`;

export function validateMetadata(metadata) {
  const errors = [];
  
  // Check required fields
  const required = METADATA_SCHEMA.required;
  for (const field of required) {
    if (!metadata[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate version format
  if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push('Version must follow semantic versioning (x.y.z)');
  }
  
  // Validate date formats
  const dateFields = ['lastModified', 'lastAudit'];
  for (const field of dateFields) {
    if (metadata[field] && isNaN(Date.parse(metadata[field]))) {
      errors.push(`Invalid date format for ${field}`);
    }
  }
  
  // Validate enums
  if (metadata.ecosystemVersion && !['v1.0.0', 'v2.0.0'].includes(metadata.ecosystemVersion)) {
    errors.push('ecosystemVersion must be v1.0.0 or v2.0.0');
  }
  
  if (metadata.category && !['global', 'module', 'script', 'technical-analysis', 'runbook', 'api', 'deployment', 'integration'].includes(metadata.category)) {
    errors.push('Invalid category value');
  }
  
  if (metadata.language && !['en', 'es'].includes(metadata.language)) {
    errors.push('Language must be en or es');
  }
  
  if (metadata.completeness && !['draft', 'review', 'complete'].includes(metadata.completeness)) {
    errors.push('Completeness must be draft, review, or complete');
  }
  
  return errors;
}

export function createDefaultMetadata(options = {}) {
  return {
    version: options.version || '1.0.0',
    author: options.author || 'Q Ecosystem Team',
    lastModified: new Date().toISOString(),
    reviewedBy: options.reviewedBy || '',
    module: options.module || null,
    relatedModules: options.relatedModules || [],
    ecosystemVersion: options.ecosystemVersion || 'v2.0.0',
    lastAudit: new Date().toISOString(),
    category: options.category || 'global',
    language: options.language || 'en',
    completeness: options.completeness || 'draft',
    dependencies: options.dependencies || [],
    tags: options.tags || []
  };
}