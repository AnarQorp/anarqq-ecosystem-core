#!/usr/bin/env node

/**
 * Visual Asset Management System
 * Manages diagrams, design tokens, and visual assets for documentation and video scripts
 * Supports Mermaid/Excalidraw diagrams with IPFS storage and automated generation
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';

export class VisualAssetManager {
  constructor() {
    this.assets = new Map();
    this.diagrams = new Map();
    this.designTokens = {};
    this.assetLibrary = {};
    this.errors = [];
    this.warnings = [];
    this.config = {
      assetsDir: 'docs/assets',
      diagramsDir: 'docs/assets/diagrams',
      tokensFile: 'docs/assets/design-tokens.json',
      libraryFile: 'docs/assets/visual-library.json',
      ipfsGateway: 'https://ipfs.io/ipfs/',
      supportedFormats: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'mermaid', 'excalidraw']
    };
  }

  /**
   * Initialize the visual asset manager
   */
  async init() {
    console.log('🎨 Initializing Visual Asset Manager...');
    
    await this.createDirectories();
    await this.loadDesignTokens();
    await this.loadAssetLibrary();
    await this.scanExistingAssets();
    
    console.log(`✅ Initialized with ${this.assets.size} assets and ${this.diagrams.size} diagrams`);
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const dirs = [
      this.config.assetsDir,
      this.config.diagramsDir,
      `${this.config.assetsDir}/logos`,
      `${this.config.assetsDir}/icons`,
      `${this.config.assetsDir}/screenshots`,
      `${this.config.assetsDir}/animations`,
      `${this.config.diagramsDir}/mermaid`,
      `${this.config.diagramsDir}/excalidraw`,
      `${this.config.diagramsDir}/generated`
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Load design tokens system
   */
  async loadDesignTokens() {
    try {
      const tokensContent = await fs.readFile(this.config.tokensFile, 'utf8');
      this.designTokens = JSON.parse(tokensContent);
    } catch (error) {
      // Create default design tokens if file doesn't exist
      this.designTokens = this.createDefaultDesignTokens();
      await this.saveDesignTokens();
    }
  }

  /**
   * Create default design tokens
   */
  createDefaultDesignTokens() {
    return {
      colors: {
        primary: {
          q_blue: '#0066CC',
          q_purple: '#6B46C1',
          q_green: '#10B981',
          q_orange: '#F59E0B'
        },
        secondary: {
          light_blue: '#3B82F6',
          light_purple: '#8B5CF6',
          light_green: '#34D399',
          light_orange: '#FBBF24'
        },
        neutral: {
          white: '#FFFFFF',
          gray_50: '#F9FAFB',
          gray_100: '#F3F4F6',
          gray_200: '#E5E7EB',
          gray_300: '#D1D5DB',
          gray_400: '#9CA3AF',
          gray_500: '#6B7280',
          gray_600: '#4B5563',
          gray_700: '#374151',
          gray_800: '#1F2937',
          gray_900: '#111827',
          black: '#000000'
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6'
        }
      },
      typography: {
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          mono: 'JetBrains Mono, Consolas, monospace',
          display: 'Inter Display, Inter, sans-serif'
        },
        sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
          '5xl': '3rem',
          '6xl': '3.75rem'
        },
        weights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem'
      },
      borders: {
        radius: {
          none: '0',
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          '2xl': '1rem',
          full: '9999px'
        },
        width: {
          thin: '1px',
          medium: '2px',
          thick: '4px'
        }
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      },
      branding: {
        logos: {
          primary: 'anarq-logo-primary.svg',
          secondary: 'anarq-logo-secondary.svg',
          icon: 'anarq-icon.svg',
          wordmark: 'anarq-wordmark.svg'
        },
        modules: {
          squid: { color: '#0066CC', icon: 'squid-icon.svg' },
          qlock: { color: '#6B46C1', icon: 'qlock-icon.svg' },
          qonsent: { color: '#10B981', icon: 'qonsent-icon.svg' },
          qindex: { color: '#F59E0B', icon: 'qindex-icon.svg' },
          qwallet: { color: '#3B82F6', icon: 'qwallet-icon.svg' },
          qerberos: { color: '#8B5CF6', icon: 'qerberos-icon.svg' },
          qmask: { color: '#34D399', icon: 'qmask-icon.svg' },
          qdrive: { color: '#FBBF24', icon: 'qdrive-icon.svg' },
          qpic: { color: '#EF4444', icon: 'qpic-icon.svg' },
          qmarket: { color: '#06B6D4', icon: 'qmarket-icon.svg' },
          qmail: { color: '#8B5A2B', icon: 'qmail-icon.svg' },
          qchat: { color: '#EC4899', icon: 'qchat-icon.svg' },
          qnet: { color: '#84CC16', icon: 'qnet-icon.svg' },
          dao: { color: '#F97316', icon: 'dao-icon.svg' }
        }
      }
    };
  }

  /**
   * Load visual asset library
   */
  async loadAssetLibrary() {
    try {
      const libraryContent = await fs.readFile(this.config.libraryFile, 'utf8');
      this.assetLibrary = JSON.parse(libraryContent);
    } catch (error) {
      // Create default asset library if file doesn't exist
      this.assetLibrary = this.createDefaultAssetLibrary();
      await this.saveAssetLibrary();
    }
  }

  /**
   * Create default asset library
   */
  createDefaultAssetLibrary() {
    return {
      categories: {
        logos: {
          description: 'Brand logos and wordmarks',
          assets: []
        },
        icons: {
          description: 'Module icons and UI elements',
          assets: []
        },
        diagrams: {
          description: 'Architecture and flow diagrams',
          assets: []
        },
        screenshots: {
          description: 'Interface screenshots and demos',
          assets: []
        },
        animations: {
          description: 'Animated graphics and transitions',
          assets: []
        }
      },
      templates: {
        mermaid: {
          architecture: this.getMermaidArchitectureTemplate(),
          sequence: this.getMermaidSequenceTemplate(),
          flowchart: this.getMermaidFlowchartTemplate(),
          ecosystem: this.getMermaidEcosystemTemplate()
        },
        excalidraw: {
          wireframe: this.getExcalidrawWireframeTemplate(),
          diagram: this.getExcalidrawDiagramTemplate()
        }
      },
      standards: {
        naming: {
          pattern: '{category}-{module}-{type}-{version}',
          examples: [
            'diagram-qwallet-architecture-v1',
            'icon-squid-primary-v2',
            'screenshot-qmarket-interface-v1'
          ]
        },
        dimensions: {
          icons: { width: 64, height: 64 },
          logos: { width: 200, height: 60 },
          screenshots: { width: 1200, height: 800 },
          diagrams: { width: 800, height: 600 }
        },
        formats: {
          vector: ['svg'],
          raster: ['png', 'jpg', 'webp'],
          diagrams: ['mermaid', 'excalidraw']
        }
      }
    };
  }

  /**
   * Scan existing assets in the filesystem
   */
  async scanExistingAssets() {
    try {
      await this.scanDirectory(this.config.assetsDir);
      console.log(`📁 Scanned ${this.assets.size} existing assets`);
    } catch (error) {
      this.warnings.push(`Could not scan existing assets: ${error.message}`);
    }
  }

  /**
   * Recursively scan directory for assets
   */
  async scanDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase().slice(1);
          if (this.config.supportedFormats.includes(ext)) {
            await this.registerAsset(fullPath);
          }
        }
      }
    } catch (error) {
      this.warnings.push(`Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Register an asset in the system
   */
  async registerAsset(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const relativePath = path.relative('.', filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const name = path.basename(filePath, path.extname(filePath));
      
      // Generate content hash for versioning
      const content = await fs.readFile(filePath);
      const hash = this.generateHashFromContent(content);
      
      const asset = {
        id: `${name}-${hash}`,
        name: name,
        path: relativePath,
        type: this.getAssetType(ext),
        format: ext,
        size: stats.size,
        hash: hash,
        created: stats.birthtime,
        modified: stats.mtime,
        metadata: await this.extractAssetMetadata(filePath, ext),
        ipfsCid: null, // Will be populated when uploaded to IPFS
        tags: this.generateAssetTags(name, relativePath)
      };
      
      this.assets.set(asset.id, asset);
      
      // If it's a diagram, also register in diagrams collection
      if (ext === 'mermaid' || ext === 'excalidraw' || asset.type === 'diagram') {
        this.diagrams.set(asset.id, asset);
      }
      
    } catch (error) {
      this.warnings.push(`Could not register asset ${filePath}: ${error.message}`);
    }
  }

  /**
   * Generate hash from content
   */
  generateHashFromContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  }

  /**
   * Get asset type from extension
   */
  getAssetType(ext) {
    const typeMap = {
      svg: 'vector',
      png: 'raster',
      jpg: 'raster',
      jpeg: 'raster',
      webp: 'raster',
      mermaid: 'diagram',
      excalidraw: 'diagram'
    };
    return typeMap[ext] || 'unknown';
  }

  /**
   * Extract metadata from asset file
   */
  async extractAssetMetadata(filePath, ext) {
    const metadata = {
      dimensions: null,
      description: null,
      author: null,
      version: null,
      module: null,
      category: null
    };

    try {
      // Extract module from path
      const pathParts = filePath.split(path.sep);
      const moduleMatch = pathParts.find(part => 
        ['squid', 'qlock', 'qonsent', 'qindex', 'qwallet', 'qerberos', 
         'qmask', 'qdrive', 'qpic', 'qmarket', 'qmail', 'qchat', 'qnet', 'dao'].includes(part)
      );
      if (moduleMatch) {
        metadata.module = moduleMatch;
      }

      // Extract category from path
      const categoryMatch = pathParts.find(part => 
        ['logos', 'icons', 'diagrams', 'screenshots', 'animations'].includes(part)
      );
      if (categoryMatch) {
        metadata.category = categoryMatch;
      }

      // For Mermaid diagrams, extract title and description
      if (ext === 'mermaid') {
        const content = await fs.readFile(filePath, 'utf8');
        const titleMatch = content.match(/title\s*:\s*(.+)/);
        if (titleMatch) {
          metadata.description = titleMatch[1].trim();
        }
      }

      // For SVG files, extract title and description
      if (ext === 'svg') {
        const content = await fs.readFile(filePath, 'utf8');
        const titleMatch = content.match(/<title>([^<]+)<\/title>/);
        const descMatch = content.match(/<desc>([^<]+)<\/desc>/);
        if (titleMatch) metadata.description = titleMatch[1];
        
        // Extract dimensions from viewBox or width/height
        const viewBoxMatch = content.match(/viewBox="[^"]*\s+([0-9.]+)\s+([0-9.]+)"/);
        const widthMatch = content.match(/width="([0-9.]+)"/);
        const heightMatch = content.match(/height="([0-9.]+)"/);
        
        if (viewBoxMatch) {
          metadata.dimensions = { width: parseFloat(viewBoxMatch[1]), height: parseFloat(viewBoxMatch[2]) };
        } else if (widthMatch && heightMatch) {
          metadata.dimensions = { width: parseFloat(widthMatch[1]), height: parseFloat(heightMatch[1]) };
        }
      }

    } catch (error) {
      this.warnings.push(`Could not extract metadata from ${filePath}: ${error.message}`);
    }

    return metadata;
  }

  /**
   * Generate tags for asset based on name and path
   */
  generateAssetTags(name, filePath) {
    const tags = new Set();
    
    // Add module tags
    const modules = ['squid', 'qlock', 'qonsent', 'qindex', 'qwallet', 'qerberos', 
                   'qmask', 'qdrive', 'qpic', 'qmarket', 'qmail', 'qchat', 'qnet', 'dao'];
    modules.forEach(module => {
      if (name.toLowerCase().includes(module) || filePath.toLowerCase().includes(module)) {
        tags.add(module);
      }
    });

    // Add category tags
    const categories = ['logo', 'icon', 'diagram', 'screenshot', 'animation', 'architecture', 'flow', 'sequence'];
    categories.forEach(category => {
      if (name.toLowerCase().includes(category) || filePath.toLowerCase().includes(category)) {
        tags.add(category);
      }
    });

    // Add type tags
    if (name.includes('primary') || name.includes('main')) tags.add('primary');
    if (name.includes('secondary') || name.includes('alt')) tags.add('secondary');
    if (name.includes('dark')) tags.add('dark');
    if (name.includes('light')) tags.add('light');

    return Array.from(tags);
  }

  /**
   * Create a new Mermaid diagram
   */
  async createMermaidDiagram(name, content, metadata = {}) {
    const fileName = `${name}.mermaid`;
    const filePath = path.join(this.config.diagramsDir, 'mermaid', fileName);
    
    // Add metadata as comments
    const fullContent = this.addMermaidMetadata(content, metadata);
    
    await fs.writeFile(filePath, fullContent, 'utf8');
    
    // Register asset with metadata
    await this.registerAsset(filePath);
    
    // Update asset with provided metadata
    const assetId = `${name}-${this.generateHashFromContent(fullContent)}`;
    const asset = this.assets.get(assetId);
    if (asset && metadata.module) {
      asset.metadata.module = metadata.module;
      asset.tags = [...new Set([...asset.tags, metadata.module])];
      this.assets.set(assetId, asset);
    }
    
    console.log(`✅ Created Mermaid diagram: ${fileName}`);
    return filePath;
  }

  /**
   * Add metadata to Mermaid diagram as comments
   */
  addMermaidMetadata(content, metadata) {
    const metadataLines = [
      `%% Generated by Visual Asset Manager`,
      `%% Created: ${new Date().toISOString()}`,
    ];

    if (metadata.title) metadataLines.push(`%% Title: ${metadata.title}`);
    if (metadata.description) metadataLines.push(`%% Description: ${metadata.description}`);
    if (metadata.module) metadataLines.push(`%% Module: ${metadata.module}`);
    if (metadata.version) metadataLines.push(`%% Version: ${metadata.version}`);

    return metadataLines.join('\n') + '\n\n' + content;
  }

  /**
   * Generate diagram from OpenAPI specification
   */
  async generateOpenAPIDiagram(specPath, outputName) {
    try {
      console.log(`📊 Generating OpenAPI diagram for ${specPath}...`);
      
      // Read OpenAPI spec
      const specContent = await fs.readFile(specPath, 'utf8');
      const spec = yaml.load(specContent);
      
      // Generate Mermaid diagram from OpenAPI spec
      const mermaidContent = this.openApiToMermaid(spec);
      
      const metadata = {
        title: spec.info?.title || 'API Documentation',
        description: spec.info?.description || 'Generated from OpenAPI specification',
        version: spec.info?.version || '1.0.0',
        source: 'openapi',
        sourceFile: specPath
      };
      
      return await this.createMermaidDiagram(outputName, mermaidContent, metadata);
      
    } catch (error) {
      this.errors.push(`Failed to generate OpenAPI diagram: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert OpenAPI spec to Mermaid diagram
   */
  openApiToMermaid(spec) {
    const paths = spec.paths || {};
    const components = spec.components?.schemas || {};
    
    let mermaid = 'graph TD\n';
    
    // Add API info
    mermaid += `    API["${spec.info?.title || 'API'}<br/>${spec.info?.version || '1.0.0'}"]\n`;
    
    // Add paths
    Object.keys(paths).forEach((pathKey, index) => {
      const pathId = `PATH${index}`;
      const methods = Object.keys(paths[pathKey]);
      const methodsStr = methods.join(', ').toUpperCase();
      
      mermaid += `    ${pathId}["${pathKey}<br/>${methodsStr}"]\n`;
      mermaid += `    API --> ${pathId}\n`;
      
      // Add responses
      methods.forEach((method, methodIndex) => {
        const operation = paths[pathKey][method];
        if (operation.responses) {
          Object.keys(operation.responses).forEach((statusCode, respIndex) => {
            const respId = `RESP${index}_${methodIndex}_${respIndex}`;
            mermaid += `    ${respId}["${statusCode}<br/>${operation.responses[statusCode].description || ''}"]\n`;
            mermaid += `    ${pathId} --> ${respId}\n`;
          });
        }
      });
    });
    
    // Add schemas
    Object.keys(components).forEach((schemaName, index) => {
      const schemaId = `SCHEMA${index}`;
      mermaid += `    ${schemaId}["${schemaName}<br/>Schema"]\n`;
      mermaid += `    API --> ${schemaId}\n`;
    });
    
    return mermaid;
  }

  /**
   * Generate diagram from MCP specification
   */
  async generateMCPDiagram(mcpPath, outputName) {
    try {
      console.log(`🔧 Generating MCP diagram for ${mcpPath}...`);
      
      // Read MCP spec
      const mcpContent = await fs.readFile(mcpPath, 'utf8');
      const mcp = JSON.parse(mcpContent);
      
      // Generate Mermaid diagram from MCP spec
      const mermaidContent = this.mcpToMermaid(mcp);
      
      const metadata = {
        title: `MCP Tools - ${path.basename(mcpPath, '.json')}`,
        description: 'Generated from MCP specification',
        version: '1.0.0',
        source: 'mcp',
        sourceFile: mcpPath
      };
      
      return await this.createMermaidDiagram(outputName, mermaidContent, metadata);
      
    } catch (error) {
      this.errors.push(`Failed to generate MCP diagram: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert MCP spec to Mermaid diagram
   */
  mcpToMermaid(mcp) {
    let mermaid = 'graph TD\n';
    
    // Add MCP server info
    const serverName = Object.keys(mcp.mcpServers || {})[0] || 'MCP Server';
    mermaid += `    SERVER["${serverName}<br/>MCP Server"]\n`;
    
    // Add tools (if available in the spec)
    if (mcp.tools) {
      Object.keys(mcp.tools).forEach((toolName, index) => {
        const toolId = `TOOL${index}`;
        const tool = mcp.tools[toolName];
        
        mermaid += `    ${toolId}["${toolName}<br/>${tool.description || 'Tool'}"]\n`;
        mermaid += `    SERVER --> ${toolId}\n`;
        
        // Add parameters
        if (tool.parameters) {
          Object.keys(tool.parameters).forEach((paramName, paramIndex) => {
            const paramId = `PARAM${index}_${paramIndex}`;
            mermaid += `    ${paramId}["${paramName}<br/>Parameter"]\n`;
            mermaid += `    ${toolId} --> ${paramId}\n`;
          });
        }
      });
    }
    
    return mermaid;
  }

  /**
   * Get Mermaid templates
   */
  getMermaidArchitectureTemplate() {
    return `graph TB
    subgraph "Q∞ Architecture"
        UI[User Interface Layer]
        API[API Gateway Layer]
        CORE[Core Services Layer]
        DATA[Data Layer]
    end
    
    UI --> API
    API --> CORE
    CORE --> DATA`;
  }

  getMermaidSequenceTemplate() {
    return `sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Service
    participant Database
    
    User->>Frontend: Action
    Frontend->>API: Request
    API->>Service: Process
    Service->>Database: Query
    Database-->>Service: Result
    Service-->>API: Response
    API-->>Frontend: Data
    Frontend-->>User: Update`;
  }

  getMermaidFlowchartTemplate() {
    return `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;
  }

  getMermaidEcosystemTemplate() {
    return `graph TB
    subgraph "AnarQ&Q Ecosystem"
        SQUID[sQuid Identity]
        QWALLET[Qwallet]
        QMARKET[Qmarket]
        QMAIL[Qmail]
        QCHAT[Qchat]
        QDRIVE[Qdrive]
        QLOCK[Qlock]
        QONSENT[Qonsent]
        QINDEX[Qindex]
        QERBEROS[Qerberos]
        QMASK[Qmask]
        QPIC[QpiC]
        QNET[QNET]
        DAO[DAO]
    end
    
    SQUID --> QWALLET
    SQUID --> QMARKET
    SQUID --> QMAIL
    QWALLET --> QMARKET
    QMARKET --> QPIC
    QMAIL --> QCHAT
    QDRIVE --> QPIC
    QLOCK --> QONSENT
    QINDEX --> QERBEROS
    QMASK --> QNET
    DAO --> QWALLET`;
  }

  getExcalidrawWireframeTemplate() {
    return {
      type: "excalidraw",
      version: 2,
      source: "visual-asset-manager",
      elements: [],
      appState: {
        gridSize: null,
        viewBackgroundColor: "#ffffff"
      }
    };
  }

  getExcalidrawDiagramTemplate() {
    return {
      type: "excalidraw",
      version: 2,
      source: "visual-asset-manager",
      elements: [],
      appState: {
        gridSize: 20,
        viewBackgroundColor: "#ffffff"
      }
    };
  }

  /**
   * Save design tokens to file
   */
  async saveDesignTokens() {
    const content = JSON.stringify(this.designTokens, null, 2);
    await fs.writeFile(this.config.tokensFile, content, 'utf8');
  }

  /**
   * Save asset library to file
   */
  async saveAssetLibrary() {
    const content = JSON.stringify(this.assetLibrary, null, 2);
    await fs.writeFile(this.config.libraryFile, content, 'utf8');
  }

  /**
   * Generate asset manifest for video scripts
   */
  generateAssetManifest(scriptType, moduleName = null) {
    const manifest = {
      type: scriptType,
      module: moduleName,
      assets: {
        logos: [],
        icons: [],
        diagrams: [],
        screenshots: [],
        animations: []
      },
      designTokens: this.designTokens,
      generatedAt: new Date().toISOString()
    };

    // Filter assets by module if specified
    const relevantAssets = Array.from(this.assets.values()).filter(asset => {
      if (!moduleName) return true;
      return asset.metadata.module === moduleName || asset.tags.includes(moduleName);
    });

    // Categorize assets
    relevantAssets.forEach(asset => {
      const category = asset.metadata.category || this.inferCategoryFromTags(asset.tags);
      if (manifest.assets[category]) {
        manifest.assets[category].push({
          id: asset.id,
          name: asset.name,
          path: asset.path,
          ipfsCid: asset.ipfsCid,
          type: asset.type,
          format: asset.format,
          metadata: asset.metadata
        });
      }
    });

    return manifest;
  }

  /**
   * Infer category from asset tags
   */
  inferCategoryFromTags(tags) {
    if (tags.includes('logo')) return 'logos';
    if (tags.includes('icon')) return 'icons';
    if (tags.includes('diagram') || tags.includes('architecture') || tags.includes('flow')) return 'diagrams';
    if (tags.includes('screenshot')) return 'screenshots';
    if (tags.includes('animation')) return 'animations';
    return 'icons'; // default
  }

  /**
   * Get asset by ID
   */
  getAsset(id) {
    return this.assets.get(id);
  }

  /**
   * Search assets by criteria
   */
  searchAssets(criteria) {
    return Array.from(this.assets.values()).filter(asset => {
      if (criteria.module && !asset.tags.includes(criteria.module)) return false;
      if (criteria.category && asset.metadata.category !== criteria.category) return false;
      if (criteria.type && asset.type !== criteria.type) return false;
      if (criteria.format && asset.format !== criteria.format) return false;
      if (criteria.tags && !criteria.tags.every(tag => asset.tags.includes(tag))) return false;
      return true;
    });
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const report = {
      summary: {
        totalAssets: this.assets.size,
        totalDiagrams: this.diagrams.size,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      assetsByType: {},
      assetsByCategory: {},
      assetsByModule: {},
      designTokensLoaded: Object.keys(this.designTokens).length > 0,
      libraryTemplates: Object.keys(this.assetLibrary.templates || {}).length
    };

    // Count by type
    Array.from(this.assets.values()).forEach(asset => {
      report.assetsByType[asset.type] = (report.assetsByType[asset.type] || 0) + 1;
      
      if (asset.metadata.category) {
        report.assetsByCategory[asset.metadata.category] = (report.assetsByCategory[asset.metadata.category] || 0) + 1;
      }
      
      if (asset.metadata.module) {
        report.assetsByModule[asset.metadata.module] = (report.assetsByModule[asset.metadata.module] || 0) + 1;
      }
    });

    return report;
  }
}

// CLI functionality
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new VisualAssetManager();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  try {
    await manager.init();
    
    switch (command) {
      case 'scan':
        console.log('📁 Scanning assets...');
        const report = manager.generateReport();
        console.log('📊 Asset Report:', JSON.stringify(report, null, 2));
        break;
        
      case 'generate-openapi':
        if (args.length < 2) {
          console.error('Usage: generate-openapi <spec-path> <output-name>');
          process.exit(1);
        }
        await manager.generateOpenAPIDiagram(args[0], args[1]);
        break;
        
      case 'generate-mcp':
        if (args.length < 2) {
          console.error('Usage: generate-mcp <mcp-path> <output-name>');
          process.exit(1);
        }
        await manager.generateMCPDiagram(args[0], args[1]);
        break;
        
      case 'create-diagram':
        if (args.length < 2) {
          console.error('Usage: create-diagram <name> <content>');
          process.exit(1);
        }
        await manager.createMermaidDiagram(args[0], args[1]);
        break;
        
      default:
        console.log('Available commands: scan, generate-openapi, generate-mcp, create-diagram');
    }
    
    if (manager.errors.length > 0) {
      console.error('❌ Errors:', manager.errors);
    }
    
    if (manager.warnings.length > 0) {
      console.warn('⚠️  Warnings:', manager.warnings);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}