#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MasterIndexBuilder {
  constructor() {
    this.rootPath = path.resolve(__dirname, '..');
    this.docsPath = path.join(this.rootPath, 'docs');
    this.documentIndex = { global: {}, modules: {} };
  }

  async buildMasterIndex() {
    console.log('🏗️  Building master documentation index...');
    await this.scanModuleDocumentation();
    await this.updateMainDocumentationFiles();
    console.log('✅ Master index build completed');
    return this.documentIndex;
  }

  async scanModuleDocumentation() {
    const modulesPath = path.join(this.docsPath, 'modules');
    try {
      const modules = await fs.readdir(modulesPath, { withFileTypes: true });
      const moduleDirectories = modules.filter(entry => entry.isDirectory());

      for (const moduleDir of moduleDirectories) {
        const modulePath = path.join(modulesPath, moduleDir.name);
        this.documentIndex.modules[moduleDir.name] = await this.scanDirectory(modulePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not scan module documentation: ${error.message}`);
    }
  }

  async scanDirectory(dirPath) {
    const result = { path: dirPath, files: {} };
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const entryPath = path.join(dirPath, entry.name);
          result.files[entry.name] = {
            path: entryPath,
            relativePath: path.relative(this.docsPath, entryPath)
          };
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
    return result;
  }

  async updateMainDocumentationFiles() {
    console.log('📝 Updating main documentation files...');
    await this.updateMainReadme();
    await this.updateIndexFile();
  }

  async updateMainReadme() {
    const readmePath = path.join(this.docsPath, 'README.md');
    try {
      const currentContent = await fs.readFile(readmePath, 'utf8');
      const frontMatter = this.extractFrontMatter(currentContent);
      const newContent = this.generateMainReadmeContent();
      const updatedFrontMatter = {
        ...frontMatter,
        lastModified: new Date().toISOString(),
        lastAudit: new Date().toISOString()
      };
      const finalContent = this.addFrontMatter(newContent, updatedFrontMatter);
      await fs.writeFile(readmePath, finalContent, 'utf8');
      console.log('✅ Updated docs/README.md');
    } catch (error) {
      console.error(`Error updating README.md: ${error.message}`);
    }
  }

  async updateIndexFile() {
    const indexPath = path.join(this.docsPath, 'INDEX.md');
    try {
      const newContent = this.generateIndexContent();
      await fs.writeFile(indexPath, newContent, 'utf8');
      console.log('✅ Updated docs/INDEX.md');
    } catch (error) {
      console.error(`Error updating INDEX.md: ${error.message}`);
    }
  }

  generateMainReadmeContent() {
    return `# Q Ecosystem Documentation

## Overview

Welcome to the comprehensive documentation for the Q ecosystem.

## Quick Navigation

### 📋 Documentation Categories
- [**Global Documentation**](./global/) - Ecosystem-wide documentation and architecture
- [**Module Documentation**](./modules/) - Complete module documentation
- [**Integration Guides**](./integration/) - Module integration patterns
- [**Deployment Guides**](./deployment/) - Environment configurations
- [**Integration Patterns**](./INTEGRATIONS/) - External system integration guidelines *(Coming Soon)*
- [**Demo Environment**](./DEMO/) - Demo environment operational procedures *(Coming Soon)*

### 🔍 Master Index
- [**Complete Documentation Index**](./INDEX.md) - Comprehensive documentation catalog

## Module Overview

The Q ecosystem consists of ${Object.keys(this.documentIndex.modules).length} core modules.

## Getting Started

### Development Environment

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/anarq/q-ecosystem.git
   cd q-ecosystem
   \`\`\`

2. **Start all modules in development mode:**
   \`\`\`bash
   docker-compose -f docker-compose.dev.yml up
   \`\`\`

## Contributing

### Documentation Updates

1. **Index regeneration:**
   \`\`\`bash
   npm run docs:index:build
   \`\`\`

---

*Last updated: ${new Date().toISOString()}*
*Generated automatically by the Q Ecosystem Master Index Builder*
`;
  }

  generateIndexContent() {
    return `# Q Ecosystem Documentation Index

Welcome to the comprehensive documentation index for the Q Ecosystem.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Global Documentation](#global-documentation)
- [Module Documentation](#module-documentation)
- [Integration & Demo Resources](#integration--demo-resources)

---

## 🚀 Quick Start

### Essential Reading
- [Main README](README.md) - Project overview and getting started

---

## 🌐 Global Documentation

### Architecture & Vision
- [**Global Documentation Hub**](global/) - Ecosystem architecture and strategic vision *(Coming Soon)*
- [**Pi Network Integration**](global/integrations/pi/) - Pi Network connectivity specification *(Coming Soon)*

---

## 🧩 Module Documentation

The Q ecosystem consists of ${Object.keys(this.documentIndex.modules).length} modules.

---

## 🔗 Integration & Demo Resources

### Integration Guidelines
- [**Integration Patterns**](INTEGRATIONS/) - External system integration patterns and guidelines *(Coming Soon)*
- [**Authentication Patterns**](INTEGRATIONS/#authentication-patterns) - Standard authentication integration flows *(Coming Soon)*
- [**Data Exchange Patterns**](INTEGRATIONS/#data-exchange-patterns) - API and event-driven integration patterns *(Coming Soon)*

### Demo Environment
- [**Demo Runbook**](DEMO/runbook.md) - Demo environment operational procedures *(Coming Soon)*
- [**Demo Scenarios**](DEMO/runbook.md#demo-scenarios) - User workflow demonstrations *(Coming Soon)*
- [**Maintenance Procedures**](DEMO/runbook.md#maintenance) - Demo environment maintenance *(Coming Soon)*

---

## 📊 Documentation Statistics

- Modules documented: ${Object.keys(this.documentIndex.modules).length}
- Last updated: ${new Date().toISOString()}

---

*Last updated: ${new Date().toISOString()}*
*Index generated automatically by Master Index Builder*
`;
  }

  extractFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      try {
        const yamlContent = frontMatterMatch[1];
        const frontMatter = {};
        yamlContent.split('\n').forEach(line => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            frontMatter[match[1]] = value;
          }
        });
        return frontMatter;
      } catch (error) {
        return {};
      }
    }
    return {};
  }

  addFrontMatter(content, frontMatter) {
    const yamlLines = Object.entries(frontMatter).map(([key, value]) => {
      if (typeof value === 'string' && (value.includes(' ') || value.includes(':'))) {
        return `${key}: '${value}'`;
      }
      return `${key}: ${value}`;
    });
    return `---\n${yamlLines.join('\n')}\n---\n\n${content}`;
  }
}

export default MasterIndexBuilder;

if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new MasterIndexBuilder();
  try {
    console.log('🚀 Starting Master Index Builder...');
    const result = await builder.buildMasterIndex();
    console.log('\n📊 Build Summary:');
    console.log(`- Modules documented: ${Object.keys(result.modules).length}`);
    console.log('\n✅ Master index build completed successfully!');
  } catch (error) {
    console.error('❌ Master index build failed:', error.message);
    process.exit(1);
  }
}
