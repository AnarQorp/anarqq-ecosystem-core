#!/usr/bin/env node

/**
 * Automated Diagram Generator
 * Scans for OpenAPI and MCP specifications and generates corresponding diagrams
 * Integrates with VisualAssetManager for unified asset management
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import yaml from 'js-yaml';
import { VisualAssetManager } from './VisualAssetManager.mjs';

export class AutomatedDiagramGenerator {
  constructor() {
    this.assetManager = new VisualAssetManager();
    this.specs = {
      openapi: [],
      mcp: []
    };
    this.generatedDiagrams = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Initialize the diagram generator
   */
  async init() {
    console.log('🤖 Initializing Automated Diagram Generator...');
    
    await this.assetManager.init();
    await this.scanForSpecs();
    
    console.log(`✅ Found ${this.specs.openapi.length} OpenAPI specs and ${this.specs.mcp.length} MCP specs`);
  }

  /**
   * Scan for OpenAPI and MCP specifications
   */
  async scanForSpecs() {
    try {
      // Scan for OpenAPI specs
      const openApiPatterns = [
        'modules/**/openapi.yaml',
        'modules/**/openapi.yml',
        'modules/**/api.yaml',
        'modules/**/api.yml',
        'docs/api/**/*.yaml',
        'docs/api/**/*.yml'
      ];

      for (const pattern of openApiPatterns) {
        const files = await glob(pattern);
        for (const file of files) {
          await this.registerOpenAPISpec(file);
        }
      }

      // Scan for MCP specs
      const mcpPatterns = [
        'modules/**/mcp.json',
        '.kiro/settings/mcp.json',
        '~/.kiro/settings/mcp.json'
      ];

      for (const pattern of mcpPatterns) {
        try {
          const files = await glob(pattern);
          for (const file of files) {
            await this.registerMCPSpec(file);
          }
        } catch (error) {
          // Skip patterns that don't match any files
          if (!error.message.includes('no matches found')) {
            this.warnings.push(`Could not scan pattern ${pattern}: ${error.message}`);
          }
        }
      }

    } catch (error) {
      this.errors.push(`Failed to scan for specs: ${error.message}`);
    }
  }

  /**
   * Register an OpenAPI specification
   */
  async registerOpenAPISpec(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const spec = yaml.load(content);
      
      if (!spec.openapi && !spec.swagger) {
        this.warnings.push(`File ${filePath} is not a valid OpenAPI specification`);
        return;
      }

      const specInfo = {
        path: filePath,
        type: 'openapi',
        version: spec.openapi || spec.swagger,
        title: spec.info?.title || path.basename(filePath, path.extname(filePath)),
        description: spec.info?.description || '',
        module: this.extractModuleFromPath(filePath),
        spec: spec
      };

      this.specs.openapi.push(specInfo);
      console.log(`📋 Registered OpenAPI spec: ${specInfo.title}`);

    } catch (error) {
      this.warnings.push(`Could not register OpenAPI spec ${filePath}: ${error.message}`);
    }
  }

  /**
   * Register an MCP specification
   */
  async registerMCPSpec(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const spec = JSON.parse(content);
      
      if (!spec.mcpServers && !spec.tools) {
        this.warnings.push(`File ${filePath} is not a valid MCP specification`);
        return;
      }

      const specInfo = {
        path: filePath,
        type: 'mcp',
        title: `MCP Configuration - ${path.basename(path.dirname(filePath))}`,
        description: 'Model Context Protocol configuration',
        module: this.extractModuleFromPath(filePath),
        spec: spec
      };

      this.specs.mcp.push(specInfo);
      console.log(`🔧 Registered MCP spec: ${specInfo.title}`);

    } catch (error) {
      this.warnings.push(`Could not register MCP spec ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract module name from file path
   */
  extractModuleFromPath(filePath) {
    const pathParts = filePath.split(path.sep);
    
    // Look for modules directory
    const moduleIndex = pathParts.indexOf('modules');
    if (moduleIndex !== -1 && moduleIndex + 1 < pathParts.length) {
      return pathParts[moduleIndex + 1];
    }

    // Look for known module names in path
    const modules = ['squid', 'qlock', 'qonsent', 'qindex', 'qwallet', 'qerberos', 
                   'qmask', 'qdrive', 'qpic', 'qmarket', 'qmail', 'qchat', 'qnet', 'dao'];
    
    for (const module of modules) {
      if (filePath.toLowerCase().includes(module)) {
        return module;
      }
    }

    return 'ecosystem';
  }

  /**
   * Generate all diagrams from discovered specifications
   */
  async generateAllDiagrams() {
    console.log('🎨 Generating diagrams from specifications...');

    // Generate OpenAPI diagrams
    for (const spec of this.specs.openapi) {
      await this.generateOpenAPIDiagram(spec);
    }

    // Generate MCP diagrams
    for (const spec of this.specs.mcp) {
      await this.generateMCPDiagram(spec);
    }

    console.log(`✅ Generated ${this.generatedDiagrams.length} diagrams`);
  }

  /**
   * Generate diagram from OpenAPI specification
   */
  async generateOpenAPIDiagram(specInfo) {
    try {
      console.log(`📊 Generating OpenAPI diagram for ${specInfo.title}...`);

      const diagramName = `openapi-${specInfo.module}-${this.sanitizeName(specInfo.title)}`;
      const mermaidContent = this.openApiToMermaid(specInfo.spec, specInfo);
      
      const metadata = {
        title: `${specInfo.title} - API Documentation`,
        description: specInfo.description || 'Generated from OpenAPI specification',
        version: specInfo.spec.info?.version || '1.0.0',
        module: specInfo.module,
        source: 'openapi',
        sourceFile: specInfo.path,
        generatedAt: new Date().toISOString()
      };

      const diagramPath = await this.assetManager.createMermaidDiagram(diagramName, mermaidContent, metadata);
      
      this.generatedDiagrams.push({
        type: 'openapi',
        spec: specInfo,
        diagramPath: diagramPath,
        metadata: metadata
      });

      console.log(`✅ Generated OpenAPI diagram: ${diagramName}`);

    } catch (error) {
      this.errors.push(`Failed to generate OpenAPI diagram for ${specInfo.title}: ${error.message}`);
    }
  }

  /**
   * Generate diagram from MCP specification
   */
  async generateMCPDiagram(specInfo) {
    try {
      console.log(`🔧 Generating MCP diagram for ${specInfo.title}...`);

      const diagramName = `mcp-${specInfo.module}-tools`;
      const mermaidContent = this.mcpToMermaid(specInfo.spec, specInfo);
      
      const metadata = {
        title: `${specInfo.title} - MCP Tools`,
        description: 'Generated from MCP specification',
        version: '1.0.0',
        module: specInfo.module,
        source: 'mcp',
        sourceFile: specInfo.path,
        generatedAt: new Date().toISOString()
      };

      const diagramPath = await this.assetManager.createMermaidDiagram(diagramName, mermaidContent, metadata);
      
      this.generatedDiagrams.push({
        type: 'mcp',
        spec: specInfo,
        diagramPath: diagramPath,
        metadata: metadata
      });

      console.log(`✅ Generated MCP diagram: ${diagramName}`);

    } catch (error) {
      this.errors.push(`Failed to generate MCP diagram for ${specInfo.title}: ${error.message}`);
    }
  }

  /**
   * Convert OpenAPI spec to enhanced Mermaid diagram
   */
  openApiToMermaid(spec, specInfo) {
    const paths = spec.paths || {};
    const components = spec.components?.schemas || {};
    const servers = spec.servers || [];
    
    let mermaid = 'graph TD\n';
    
    // Add API info with styling
    const apiTitle = spec.info?.title || 'API';
    const apiVersion = spec.info?.version || '1.0.0';
    mermaid += `    API["🌐 ${apiTitle}<br/>v${apiVersion}"]\n`;
    
    // Add servers if available
    servers.forEach((server, index) => {
      const serverId = `SERVER${index}`;
      const serverUrl = new URL(server.url).hostname;
      mermaid += `    ${serverId}["🖥️ ${server.description || serverUrl}<br/>${server.url}"]\n`;
      mermaid += `    API --> ${serverId}\n`;
    });
    
    // Group paths by tags or create default groups
    const pathGroups = this.groupPathsByTags(paths);
    
    Object.entries(pathGroups).forEach(([groupName, groupPaths], groupIndex) => {
      const groupId = `GROUP${groupIndex}`;
      mermaid += `    ${groupId}["📁 ${groupName}"]\n`;
      mermaid += `    API --> ${groupId}\n`;
      
      groupPaths.forEach((pathInfo, pathIndex) => {
        const pathId = `PATH${groupIndex}_${pathIndex}`;
        const methods = pathInfo.methods.join(', ').toUpperCase();
        const pathName = pathInfo.path.length > 30 ? pathInfo.path.substring(0, 27) + '...' : pathInfo.path;
        
        mermaid += `    ${pathId}["🔗 ${pathName}<br/>${methods}"]\n`;
        mermaid += `    ${groupId} --> ${pathId}\n`;
        
        // Add key responses
        pathInfo.responses.forEach((response, respIndex) => {
          if (['200', '201', '400', '401', '404', '500'].includes(response.status)) {
            const respId = `RESP${groupIndex}_${pathIndex}_${respIndex}`;
            const icon = this.getResponseIcon(response.status);
            mermaid += `    ${respId}["${icon} ${response.status}<br/>${response.description}"]\n`;
            mermaid += `    ${pathId} --> ${respId}\n`;
          }
        });
      });
    });
    
    // Add key schemas
    const keySchemas = Object.keys(components).slice(0, 5); // Limit to avoid clutter
    if (keySchemas.length > 0) {
      mermaid += `    SCHEMAS["📋 Data Models"]\n`;
      mermaid += `    API --> SCHEMAS\n`;
      
      keySchemas.forEach((schemaName, index) => {
        const schemaId = `SCHEMA${index}`;
        mermaid += `    ${schemaId}["📄 ${schemaName}"]\n`;
        mermaid += `    SCHEMAS --> ${schemaId}\n`;
      });
    }
    
    // Add styling
    mermaid += '\n';
    mermaid += '    classDef api fill:#3B82F6,stroke:#2563EB,stroke-width:3px,color:#fff\n';
    mermaid += '    classDef group fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff\n';
    mermaid += '    classDef path fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff\n';
    mermaid += '    classDef success fill:#10B981,stroke:#059669,stroke-width:1px,color:#fff\n';
    mermaid += '    classDef error fill:#EF4444,stroke:#DC2626,stroke-width:1px,color:#fff\n';
    mermaid += '    classDef schema fill:#8B5CF6,stroke:#7C3AED,stroke-width:1px,color:#fff\n';
    
    mermaid += '    class API api\n';
    
    return mermaid;
  }

  /**
   * Group API paths by tags for better organization
   */
  groupPathsByTags(paths) {
    const groups = {};
    
    Object.entries(paths).forEach(([pathKey, pathMethods]) => {
      const methods = Object.keys(pathMethods);
      const responses = [];
      
      // Extract tags and responses
      let tags = ['Default'];
      methods.forEach(method => {
        const operation = pathMethods[method];
        if (operation.tags && operation.tags.length > 0) {
          tags = operation.tags;
        }
        
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([status, response]) => {
            responses.push({
              status: status,
              description: response.description || ''
            });
          });
        }
      });
      
      // Add to appropriate group
      const groupName = tags[0];
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      
      groups[groupName].push({
        path: pathKey,
        methods: methods,
        responses: responses
      });
    });
    
    return groups;
  }

  /**
   * Get appropriate icon for HTTP response status
   */
  getResponseIcon(status) {
    if (status.startsWith('2')) return '✅';
    if (status.startsWith('3')) return '↩️';
    if (status.startsWith('4')) return '❌';
    if (status.startsWith('5')) return '💥';
    return '❓';
  }

  /**
   * Convert MCP spec to enhanced Mermaid diagram
   */
  mcpToMermaid(spec, specInfo) {
    let mermaid = 'graph TD\n';
    
    // Add MCP server info
    const servers = spec.mcpServers || {};
    const serverNames = Object.keys(servers);
    
    if (serverNames.length === 0) {
      mermaid += `    MCP["🔧 MCP Configuration<br/>${specInfo.module}"]\n`;
      return mermaid;
    }
    
    // Main MCP node
    mermaid += `    MCP["🔧 MCP Configuration<br/>${specInfo.module}"]\n`;
    
    serverNames.forEach((serverName, serverIndex) => {
      const server = servers[serverName];
      const serverId = `SERVER${serverIndex}`;
      
      // Server node
      const command = server.command || 'unknown';
      const disabled = server.disabled ? ' (Disabled)' : '';
      mermaid += `    ${serverId}["🖥️ ${serverName}<br/>${command}${disabled}"]\n`;
      mermaid += `    MCP --> ${serverId}\n`;
      
      // Environment variables
      if (server.env && Object.keys(server.env).length > 0) {
        const envId = `ENV${serverIndex}`;
        const envCount = Object.keys(server.env).length;
        mermaid += `    ${envId}["🌍 Environment<br/>${envCount} variables"]\n`;
        mermaid += `    ${serverId} --> ${envId}\n`;
      }
      
      // Arguments
      if (server.args && server.args.length > 0) {
        const argsId = `ARGS${serverIndex}`;
        const argsCount = server.args.length;
        mermaid += `    ${argsId}["⚙️ Arguments<br/>${argsCount} parameters"]\n`;
        mermaid += `    ${serverId} --> ${argsId}\n`;
      }
      
      // Auto-approve tools
      if (server.autoApprove && server.autoApprove.length > 0) {
        const approveId = `APPROVE${serverIndex}`;
        const approveCount = server.autoApprove.length;
        mermaid += `    ${approveId}["✅ Auto-Approve<br/>${approveCount} tools"]\n`;
        mermaid += `    ${serverId} --> ${approveId}\n`;
      }
    });
    
    // Add tools if available in spec
    if (spec.tools) {
      mermaid += `    TOOLS["🛠️ Available Tools"]\n`;
      mermaid += `    MCP --> TOOLS\n`;
      
      Object.keys(spec.tools).slice(0, 8).forEach((toolName, index) => {
        const toolId = `TOOL${index}`;
        const tool = spec.tools[toolName];
        mermaid += `    ${toolId}["🔨 ${toolName}<br/>${tool.description || 'Tool'}"]\n`;
        mermaid += `    TOOLS --> ${toolId}\n`;
      });
    }
    
    // Add styling
    mermaid += '\n';
    mermaid += '    classDef mcp fill:#6B46C1,stroke:#553C9A,stroke-width:3px,color:#fff\n';
    mermaid += '    classDef server fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff\n';
    mermaid += '    classDef config fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff\n';
    mermaid += '    classDef tools fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff\n';
    
    mermaid += '    class MCP mcp\n';
    
    return mermaid;
  }

  /**
   * Sanitize name for file system
   */
  sanitizeName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate integration with ScriptGenerator
   */
  async integrateWithScriptGenerator() {
    console.log('🎬 Integrating with Script Generator...');
    
    try {
      // Update ScriptGenerator to include generated diagrams
      const { ScriptGenerator } = await import('./ScriptGenerator.mjs');
      const scriptGen = new ScriptGenerator();
      await scriptGen.init();
      
      // Add diagram references to asset manifests
      for (const diagram of this.generatedDiagrams) {
        const manifest = this.assetManager.generateAssetManifest(
          diagram.type === 'openapi' ? 'api' : 'mcp',
          diagram.metadata.module
        );
        
        // Add diagram to appropriate category
        manifest.assets.diagrams.push({
          id: diagram.metadata.title,
          name: diagram.metadata.title,
          path: diagram.diagramPath,
          type: 'diagram',
          format: 'mermaid',
          metadata: diagram.metadata
        });
      }
      
      console.log('✅ Integration with Script Generator complete');
      
    } catch (error) {
      this.warnings.push(`Could not integrate with Script Generator: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    return {
      summary: {
        openApiSpecs: this.specs.openapi.length,
        mcpSpecs: this.specs.mcp.length,
        generatedDiagrams: this.generatedDiagrams.length,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      specs: {
        openapi: this.specs.openapi.map(spec => ({
          title: spec.title,
          module: spec.module,
          path: spec.path,
          version: spec.version
        })),
        mcp: this.specs.mcp.map(spec => ({
          title: spec.title,
          module: spec.module,
          path: spec.path
        }))
      },
      diagrams: this.generatedDiagrams.map(diagram => ({
        type: diagram.type,
        title: diagram.metadata.title,
        module: diagram.metadata.module,
        path: diagram.diagramPath
      })),
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// CLI functionality
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new AutomatedDiagramGenerator();
  
  const command = process.argv[2] || 'generate';
  
  try {
    await generator.init();
    
    switch (command) {
      case 'scan':
        console.log('🔍 Scanning for specifications...');
        const report = generator.generateReport();
        console.log('📊 Scan Report:', JSON.stringify(report, null, 2));
        break;
        
      case 'generate':
        await generator.generateAllDiagrams();
        await generator.integrateWithScriptGenerator();
        
        const finalReport = generator.generateReport();
        console.log('📊 Generation Report:', JSON.stringify(finalReport, null, 2));
        break;
        
      default:
        console.log('Available commands: scan, generate');
    }
    
    if (generator.errors.length > 0) {
      console.error('❌ Errors:', generator.errors);
      process.exit(1);
    }
    
    if (generator.warnings.length > 0) {
      console.warn('⚠️  Warnings:', generator.warnings);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}