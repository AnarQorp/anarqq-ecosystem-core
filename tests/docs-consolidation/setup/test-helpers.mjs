/**
 * Test Helpers for Documentation Consolidation Tests
 * Provides common utilities and mock data for testing
 */

import { vi } from 'vitest';

/**
 * Mock file system operations
 */
export const mockFileSystem = {
  /**
   * Create a mock file system with predefined structure
   */
  createMockFS: (structure) => {
    const mockFS = {
      files: new Map(),
      directories: new Set()
    };

    // Add files and directories from structure
    Object.entries(structure).forEach(([path, content]) => {
      if (typeof content === 'string') {
        mockFS.files.set(path, content);
        // Add parent directories
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join('/');
          mockFS.directories.add(dirPath);
        }
      } else if (Array.isArray(content)) {
        mockFS.directories.add(path);
      }
    });

    return mockFS;
  },

  /**
   * Setup fs mocks based on mock file system
   */
  setupFSMocks: (mockFS, fs) => {
    fs.readFile.mockImplementation(async (path, encoding) => {
      if (mockFS.files.has(path)) {
        return mockFS.files.get(path);
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    });

    fs.writeFile.mockImplementation(async (path, content) => {
      mockFS.files.set(path, content);
    });

    fs.access.mockImplementation(async (path) => {
      if (mockFS.files.has(path) || mockFS.directories.has(path)) {
        return;
      }
      throw new Error(`ENOENT: no such file or directory, access '${path}'`);
    });

    fs.readdir.mockImplementation(async (path, options) => {
      const entries = [];
      const pathPrefix = path.endsWith('/') ? path : path + '/';
      
      // Find direct children
      for (const filePath of mockFS.files.keys()) {
        if (filePath.startsWith(pathPrefix)) {
          const relativePath = filePath.substring(pathPrefix.length);
          const firstSegment = relativePath.split('/')[0];
          if (firstSegment && !entries.some(e => e.name === firstSegment)) {
            entries.push({
              name: firstSegment,
              isDirectory: () => relativePath.includes('/')
            });
          }
        }
      }

      for (const dirPath of mockFS.directories) {
        if (dirPath.startsWith(pathPrefix)) {
          const relativePath = dirPath.substring(pathPrefix.length);
          const firstSegment = relativePath.split('/')[0];
          if (firstSegment && !entries.some(e => e.name === firstSegment)) {
            entries.push({
              name: firstSegment,
              isDirectory: () => true
            });
          }
        }
      }

      return options?.withFileTypes ? entries : entries.map(e => e.name);
    });

    fs.stat.mockImplementation(async (path) => {
      if (mockFS.directories.has(path)) {
        return { isDirectory: () => true, isFile: () => false };
      }
      if (mockFS.files.has(path)) {
        return { isDirectory: () => false, isFile: () => true };
      }
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    });
  }
};

/**
 * Sample documentation content for testing
 */
export const sampleContent = {
  /**
   * Sample module documentation
   */
  moduleDoc: (moduleName, options = {}) => {
    const {
      version = '1.0.0',
      description = `${moduleName} module for the Q ecosystem`,
      features = ['Feature 1', 'Feature 2', 'Feature 3'],
      integrations = ['qindex'],
      useCases = ['Use case 1', 'Use case 2']
    } = options;

    return `---
version: "${version}"
module: "${moduleName}"
category: "module"
author: "Q Ecosystem Team"
lastModified: "${new Date().toISOString()}"
ecosystemVersion: "v2.0.0"
---

# ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Integration Points](#integration-points)
- [Use Cases](#use-cases)

## Overview

${description}

## Key Features

${features.map(f => `- ${f}`).join('\n')}

## Integration Points

This module integrates with:
${integrations.map(i => `- ${i} for enhanced functionality`).join('\n')}

## Use Cases

${useCases.map(u => `- ${u}`).join('\n')}

## Architecture

Technical architecture and implementation details.

## API Reference

Detailed API documentation and examples.
`;
  },

  /**
   * Sample global documentation
   */
  globalDoc: (title, options = {}) => {
    const {
      sections = ['Introduction', 'Overview', 'Details'],
      wordCount = 1000
    } = options;

    const content = sections.map(section => `## ${section}

${Array.from({ length: Math.floor(wordCount / sections.length / 10) }, (_, i) => 
  `This is paragraph ${i + 1} for the ${section} section with detailed information about the topic.`
).join(' ')}`).join('\n\n');

    return `---
version: "1.0.0"
category: "global"
author: "Q Ecosystem Team"
lastModified: "${new Date().toISOString()}"
ecosystemVersion: "v2.0.0"
---

# ${title}

${content}
`;
  },

  /**
   * Sample video script
   */
  videoScript: (title, language = 'en', options = {}) => {
    const {
      duration = '5 minutes',
      sections = 3,
      visualCues = 2
    } = options;

    const sectionTitles = language === 'en' 
      ? ['Introduction', 'Main Content', 'Conclusion']
      : ['Introducción', 'Contenido Principal', 'Conclusión'];

    return `---
title: "${title}"
duration: "${duration}"
language: "${language}"
version: "1.0.0"
---

# ${title}

## Script Metadata

- **Duration**: ${duration}
- **Language**: ${language === 'en' ? 'English' : 'Spanish'}
- **Target Audience**: General

## Visual Shot List

${Array.from({ length: visualCues }, (_, i) => 
  `- Shot ${i + 1}: Visual element ${i + 1}`
).join('\n')}

## Script Content

${Array.from({ length: sections }, (_, i) => `### ${sectionTitles[i]} (${i}:00 - ${i + 1}:00)

Content for ${sectionTitles[i]} section.

**[VISUAL: ${sectionTitles[i]} visual cue]**`).join('\n\n')}

## Production Notes

- **Resolution**: 1080p
- **Frame Rate**: 30fps
- **Audio Quality**: High
- **Accessibility Features**: Subtitles included

## Review Checklist

- [ ] Content reviewed for accuracy
- [ ] Timing verified
- [ ] Visual cues aligned
- [ ] Accessibility compliance checked
`;
  },

  /**
   * Sample runbook documentation
   */
  runbook: (moduleName) => `---
version: "1.0.0"
module: "${moduleName}"
category: "runbook"
author: "Operations Team"
lastModified: "${new Date().toISOString()}"
---

# ${moduleName} Operational Runbook

## Module Overview

**Name**: ${moduleName}
**Description**: Operational procedures for ${moduleName} module
**Version**: 1.0.0

## Health Checks

### Endpoints
- **Basic Health**: \`GET /health\`
- **Detailed Health**: \`GET /health/detailed\`
- **Metrics**: \`GET /metrics\`

### Expected Responses
- Health endpoint should return 200 OK
- Metrics should include key performance indicators

## Troubleshooting

### Common Issues

1. **Service Unavailable**
   - Check service status
   - Verify dependencies
   - Review logs

2. **Performance Degradation**
   - Monitor resource usage
   - Check database connections
   - Analyze request patterns

## Contact Information

- **Primary Contact**: ${moduleName}-team@q.network
- **On-Call**: operations@q.network
- **Escalation**: team-lead@q.network
`
};

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate test module structure
   */
  generateModuleStructure: (moduleNames) => {
    const structure = {};
    
    moduleNames.forEach(moduleName => {
      const moduleDir = `docs/modules/${moduleName}`;
      structure[`${moduleDir}/README.md`] = sampleContent.moduleDoc(moduleName);
      structure[`${moduleDir}/api-reference.md`] = sampleContent.moduleDoc(moduleName, {
        description: `API reference for ${moduleName}`
      });
      structure[`${moduleDir}/deployment-guide.md`] = sampleContent.moduleDoc(moduleName, {
        description: `Deployment guide for ${moduleName}`
      });
      structure[`docs/runbooks/runbook-${moduleName}.md`] = sampleContent.runbook(moduleName);
    });

    return structure;
  },

  /**
   * Generate test script structure
   */
  generateScriptStructure: (moduleNames, languages = ['en', 'es']) => {
    const structure = {};
    
    // Global scripts
    languages.forEach(lang => {
      structure[`docs/video-scripts/global/ecosystem-overview-${lang}.md`] = 
        sampleContent.videoScript(
          lang === 'en' ? 'AnarQ&Q Ecosystem Overview' : 'Visión General del Ecosistema AnarQ&Q',
          lang,
          { duration: '5-7 minutes', sections: 7, visualCues: 5 }
        );
    });

    // Module scripts
    moduleNames.forEach(moduleName => {
      languages.forEach(lang => {
        structure[`docs/video-scripts/modules/${moduleName}-${lang}.md`] = 
          sampleContent.videoScript(
            `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module`,
            lang,
            { duration: '2-3 minutes', sections: 6, visualCues: 3 }
          );
      });
    });

    return structure;
  }
};

/**
 * Validation helpers
 */
export const validationHelpers = {
  /**
   * Validate script structure
   */
  validateScriptStructure: (script) => {
    const errors = [];
    const warnings = [];

    // Required fields
    const requiredFields = ['title', 'duration', 'language', 'sections', 'visualCues', 'metadata'];
    requiredFields.forEach(field => {
      if (!script[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Section validation
    if (script.sections) {
      script.sections.forEach((section, index) => {
        if (!section.title) {
          errors.push(`Section ${index} missing title`);
        }
        if (!section.content) {
          errors.push(`Section ${index} missing content`);
        }
        if (!section.duration) {
          warnings.push(`Section ${index} missing duration`);
        }
      });
    }

    // Visual cues validation
    if (script.visualCues) {
      script.visualCues.forEach((cue, index) => {
        if (!cue.timestamp) {
          errors.push(`Visual cue ${index} missing timestamp`);
        }
        if (!cue.type) {
          errors.push(`Visual cue ${index} missing type`);
        }
        if (!cue.description) {
          warnings.push(`Visual cue ${index} missing description`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Validate metadata completeness
   */
  validateMetadata: (metadata) => {
    const errors = [];
    const requiredFields = ['version', 'author', 'lastModified', 'ecosystemVersion'];
    
    requiredFields.forEach(field => {
      if (!metadata[field]) {
        errors.push(`Missing required metadata field: ${field}`);
      }
    });

    // Validate version format
    if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      errors.push('Invalid version format, expected semver (x.y.z)');
    }

    // Validate date format
    if (metadata.lastModified && isNaN(Date.parse(metadata.lastModified))) {
      errors.push('Invalid lastModified date format');
    }

    return errors;
  }
};

/**
 * Performance testing utilities
 */
export const performanceHelpers = {
  /**
   * Measure execution time
   */
  measureTime: async (fn) => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  },

  /**
   * Generate large content for performance testing
   */
  generateLargeContent: (size = 1000) => {
    const sections = Array.from({ length: size }, (_, i) => `## Section ${i + 1}

This is section ${i + 1} with detailed content that includes multiple paragraphs and various markdown elements.

### Subsection ${i + 1}.1

More detailed content with lists:

- Item 1 for section ${i + 1}
- Item 2 for section ${i + 1}
- Item 3 for section ${i + 1}

### Subsection ${i + 1}.2

Code examples and technical details:

\`\`\`javascript
function example${i + 1}() {
  return "This is example code for section ${i + 1}";
}
\`\`\`

Additional content with **bold text** and *italic text* for emphasis.`);

    return `# Large Test Document

## Overview

This is a large document generated for performance testing.

${sections.join('\n\n')}

## Conclusion

End of large document with ${size} sections.`;
  }
};

/**
 * Mock implementations for external dependencies
 */
export const mockImplementations = {
  /**
   * Mock YAML parser
   */
  mockYaml: {
    load: vi.fn().mockImplementation((str) => {
      try {
        // Simple YAML parser for testing
        const lines = str.split('\n');
        const result = {};
        
        lines.forEach(line => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            let value = match[2].trim();
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            result[match[1]] = value;
          }
        });
        
        return result;
      } catch (error) {
        throw new Error('Invalid YAML');
      }
    }),

    dump: vi.fn().mockImplementation((obj) => {
      return Object.entries(obj)
        .map(([key, value]) => {
          if (typeof value === 'string' && (value.includes(' ') || value.includes(':'))) {
            return `${key}: '${value}'`;
          }
          return `${key}: ${value}`;
        })
        .join('\n');
    })
  }
};

export default {
  mockFileSystem,
  sampleContent,
  testData,
  validationHelpers,
  performanceHelpers,
  mockImplementations
};