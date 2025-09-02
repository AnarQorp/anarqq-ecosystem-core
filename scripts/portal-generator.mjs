#!/usr/bin/env node

/**
 * Public Documentation Portal Generator
 * Transforms validated documentation index into a versioned public portal
 * Supports multiple audiences while maintaining internal dev/ops structure
 */

import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import MasterIndexAutomation from './master-index-automation.mjs';
import ContentQualityValidator from './content-quality-validator.mjs';

class PortalGenerator {
  constructor() {
    this.indexAutomation = new MasterIndexAutomation();
    this.qualityValidator = new ContentQualityValidator();
    
    this.config = {
      outputDir: 'portal',
      publicDir: 'portal/public',
      internalDir: 'portal/internal',
      partnerDir: 'portal/partner',
      
      audiences: {
        public: {
          name: 'Public Documentation',
          description: 'Documentation for external developers and users',
          baseUrl: 'https://docs.q-ecosystem.com',
          theme: 'public'
        },
        internal: {
          name: 'Internal Documentation',
          description: 'Documentation for internal teams and operations',
          baseUrl: 'https://internal-docs.q-ecosystem.com',
          theme: 'internal'
        },
        partner: {
          name: 'Partner Documentation',
          description: 'Documentation for integration partners',
          baseUrl: 'https://partner-docs.q-ecosystem.com',
          theme: 'partner'
        }
      },
      
      contentClassification: {
        public: [
          'README.md',
          'api-reference.md',
          'integration-guide.md',
          'examples.md',
          'getting-started.md'
        ],
        internal: [
          'runbook.md',
          'troubleshooting.md',
          'deployment-guide.md',
          'security-procedures.md'
        ],
        hybrid: [
          'architecture.md',
          'migration-guide.md'
        ],
        conditional: [
          'mcp-tools.md'
        ]
      }
    };
  }

  async init() {
    await this.indexAutomation.init();
  }

  /**
   * Generate complete portal for all audiences
   */
  async generateCompletePortal() {
    console.log('🏗️ Generating complete documentation portal...');
    
    // Validate documentation first
    await this.validateDocumentationReadiness();
    
    // Generate for each audience
    for (const [audience, config] of Object.entries(this.config.audiences)) {
      console.log(`📚 Generating ${audience} portal...`);
      await this.generateAudiencePortal(audience, config);
    }
    
    // Generate shared resources
    await this.generateSharedResources();
    
    // Generate portal index
    await this.generatePortalIndex();
    
    console.log('✅ Complete portal generated successfully');
  }

  /**
   * Generate portal for specific audience
   */
  async generateAudiencePortal(audience, config) {
    const outputDir = path.join(this.config.outputDir, audience);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate portal structure
    const portalStructure = {
      overview: await this.generateOverviewPages(audience),
      modules: await this.generateModuleDocumentation(audience),
      guides: await this.generateIntegrationGuides(audience),
      api: await this.generateAPIDocumentation(audience),
      examples: await this.generateExampleGallery(audience),
      changelog: await this.generateChangelog(audience)
    };
    
    // Generate HTML pages
    await this.generateHTMLPages(portalStructure, outputDir, audience);
    
    // Generate navigation
    await this.generateNavigation(portalStructure, outputDir, audience);
    
    // Copy assets
    await this.copyAssets(outputDir, audience);
    
    console.log(`  ✅ ${audience} portal generated`);
  }

  /**
   * Validate documentation readiness for portal generation
   */
  async validateDocumentationReadiness() {
    console.log('🔍 Validating documentation readiness...');
    
    // Run master index validation
    const indexValidation = await this.indexAutomation.validateMasterIndex();
    if (!indexValidation.passed) {
      throw new Error('Master index validation failed');
    }
    
    // Run content quality validation
    const qualityReport = await this.qualityValidator.validateAllDocuments();
    if (qualityReport.summary.averageQualityScore < 70) {
      console.warn('⚠️ Documentation quality score below recommended threshold');
    }
    
    console.log('  ✅ Documentation validation passed');
  }

  /**
   * Generate overview pages for audience
   */
  async generateOverviewPages(audience) {
    const pages = {};
    
    // Main overview page
    pages.index = await this.generateMainOverview(audience);
    
    // Architecture overview
    pages.architecture = await this.generateArchitectureOverview(audience);
    
    // Getting started guide
    pages.gettingStarted = await this.generateGettingStarted(audience);
    
    // FAQ page
    pages.faq = await this.generateFAQ(audience);
    
    return pages;
  }

  /**
   * Generate module documentation for audience
   */
  async generateModuleDocumentation(audience) {
    const modules = await this.getModuleList();
    const modulePages = {};
    
    for (const module of modules) {
      const moduleContent = await this.generateModuleContent(module, audience);
      if (moduleContent) {
        modulePages[module] = moduleContent;
      }
    }
    
    return modulePages;
  }

  /**
   * Generate content for a specific module and audience
   */
  async generateModuleContent(module, audience) {
    const modulePath = path.join('docs/modules', module);
    
    try {
      const moduleContent = {
        overview: await this.transformContentForAudience(
          await this.readModuleFile(modulePath, 'README.md'),
          audience,
          module
        ),
        quickStart: await this.generateModuleQuickStart(module, audience)
      };
      
      // Add audience-appropriate content
      if (this.shouldIncludeForAudience('api-reference.md', audience)) {
        moduleContent.apiReference = await this.transformContentForAudience(
          await this.readModuleFile(modulePath, 'api-reference.md'),
          audience,
          module
        );
      }
      
      if (this.shouldIncludeForAudience('examples.md', audience)) {
        moduleContent.examples = await this.transformContentForAudience(
          await this.readModuleFile(modulePath, 'examples.md'),
          audience,
          module
        );
      }
      
      if (this.shouldIncludeForAudience('integration-guide.md', audience)) {
        moduleContent.integrationGuide = await this.transformContentForAudience(
          await this.readModuleFile(modulePath, 'integration-guide.md'),
          audience,
          module
        );
      }
      
      // Internal-only content
      if (audience === 'internal') {
        moduleContent.runbook = await this.readModuleFile(modulePath, 'runbook.md');
        moduleContent.troubleshooting = await this.readModuleFile(modulePath, 'troubleshooting.md');
        moduleContent.deploymentGuide = await this.readModuleFile(modulePath, 'deployment-guide.md');
      }
      
      return moduleContent;
    } catch (error) {
      console.warn(`Could not generate content for module ${module}:`, error.message);
      return null;
    }
  }

  /**
   * Transform content for specific audience
   */
  async transformContentForAudience(content, audience, module) {
    if (!content) return null;
    
    let transformedContent = content;
    
    switch (audience) {
      case 'public':
        transformedContent = await this.createPublicVersion(content, module);
        break;
      case 'internal':
        transformedContent = await this.createInternalVersion(content, module);
        break;
      case 'partner':
        transformedContent = await this.createPartnerVersion(content, module);
        break;
    }
    
    return {
      content: transformedContent,
      metadata: {
        audience,
        module,
        lastUpdated: new Date().toISOString(),
        generatedBy: 'portal-generator'
      }
    };
  }

  /**
   * Create public version of content
   */
  async createPublicVersion(content, module) {
    let publicContent = content;
    
    // Remove internal-only sections
    publicContent = publicContent.replace(/<!-- INTERNAL-ONLY -->[\s\S]*?<!-- \/INTERNAL-ONLY -->/g, '');
    
    // Replace internal URLs with public equivalents
    publicContent = publicContent.replace(/http:\/\/internal\./g, 'https://docs.q-ecosystem.com/');
    
    // Remove sensitive configuration examples
    publicContent = publicContent.replace(/password.*=.*$/gm, 'password=***REDACTED***');
    publicContent = publicContent.replace(/api[_-]?key.*=.*$/gm, 'api_key=***REDACTED***');
    publicContent = publicContent.replace(/secret.*=.*$/gm, 'secret=***REDACTED***');
    
    // Add public disclaimers
    publicContent = this.addPublicDisclaimers(publicContent);
    
    // Enhance with public-specific content
    publicContent = this.addPublicEnhancements(publicContent, module);
    
    return publicContent;
  }

  /**
   * Create internal version of content
   */
  async createInternalVersion(content, module) {
    let internalContent = content;
    
    // Add internal-specific enhancements
    internalContent = this.addInternalEnhancements(internalContent, module);
    
    // Add operational context
    internalContent = this.addOperationalContext(internalContent, module);
    
    return internalContent;
  }

  /**
   * Create partner version of content
   */
  async createPartnerVersion(content, module) {
    let partnerContent = content;
    
    // Remove internal operational details
    partnerContent = partnerContent.replace(/<!-- INTERNAL-OPS -->[\s\S]*?<!-- \/INTERNAL-OPS -->/g, '');
    
    // Add partner-specific information
    partnerContent = this.addPartnerEnhancements(partnerContent, module);
    
    return partnerContent;
  }

  /**
   * Generate API documentation for audience
   */
  async generateAPIDocumentation(audience) {
    const modules = await this.getModuleList();
    const apiDocs = {};
    
    for (const module of modules) {
      if (this.shouldIncludeForAudience('api-reference.md', audience)) {
        const apiSpec = await this.getModuleOpenAPISpec(module);
        if (apiSpec) {
          apiDocs[module] = {
            spec: apiSpec,
            interactive: await this.generateInteractiveAPI(apiSpec, audience),
            examples: await this.generateAPIExamples(module, audience),
            authentication: await this.generateAuthGuide(module, audience)
          };
        }
      }
    }
    
    return apiDocs;
  }

  /**
   * Generate example gallery for audience
   */
  async generateExampleGallery(audience) {
    const examples = {
      quickStart: await this.generateQuickStartExamples(audience),
      integration: await this.generateIntegrationExamples(audience),
      advanced: await this.generateAdvancedExamples(audience),
      tutorials: await this.generateTutorials(audience)
    };
    
    return examples;
  }

  /**
   * Generate HTML pages from portal structure
   */
  async generateHTMLPages(structure, outputDir, audience) {
    // Generate main pages
    for (const [section, content] of Object.entries(structure)) {
      const sectionDir = path.join(outputDir, section);
      await fs.mkdir(sectionDir, { recursive: true });
      
      if (typeof content === 'object' && content !== null) {
        for (const [page, pageContent] of Object.entries(content)) {
          const htmlContent = await this.generateHTMLPage(pageContent, audience, section, page);
          await fs.writeFile(path.join(sectionDir, `${page}.html`), htmlContent);
        }
      }
    }
    
    // Generate index page
    const indexContent = await this.generatePortalIndexPage(structure, audience);
    await fs.writeFile(path.join(outputDir, 'index.html'), indexContent);
  }

  /**
   * Generate HTML page from content
   */
  async generateHTMLPage(content, audience, section, page) {
    const template = await this.getHTMLTemplate(audience);
    const config = this.config.audiences[audience];
    
    // Convert markdown to HTML if needed
    let htmlContent = '';
    if (typeof content === 'string') {
      htmlContent = marked(content);
    } else if (content && content.content) {
      htmlContent = marked(content.content);
    }
    
    // Replace template variables
    return template
      .replace('{{TITLE}}', this.generatePageTitle(section, page))
      .replace('{{CONTENT}}', htmlContent)
      .replace('{{AUDIENCE}}', audience)
      .replace('{{BASE_URL}}', config.baseUrl)
      .replace('{{THEME}}', config.theme)
      .replace('{{NAVIGATION}}', await this.generatePageNavigation(audience))
      .replace('{{FOOTER}}', await this.generatePageFooter(audience));
  }

  /**
   * Generate portal navigation
   */
  async generateNavigation(structure, outputDir, audience) {
    const navigation = {
      main: this.generateMainNavigation(structure, audience),
      sidebar: this.generateSidebarNavigation(structure, audience),
      breadcrumbs: this.generateBreadcrumbNavigation(structure, audience)
    };
    
    await fs.writeFile(
      path.join(outputDir, 'navigation.json'),
      JSON.stringify(navigation, null, 2)
    );
  }

  /**
   * Copy assets for audience
   */
  async copyAssets(outputDir, audience) {
    const assetsDir = path.join(outputDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    
    // Copy theme-specific assets
    const themeAssetsPath = path.join('portal-assets', audience);
    try {
      await this.copyDirectory(themeAssetsPath, assetsDir);
    } catch (error) {
      console.warn(`Could not copy assets for ${audience}:`, error.message);
    }
    
    // Copy common assets
    const commonAssetsPath = 'portal-assets/common';
    try {
      await this.copyDirectory(commonAssetsPath, assetsDir);
    } catch (error) {
      console.warn('Could not copy common assets:', error.message);
    }
  }

  /**
   * Generate shared resources
   */
  async generateSharedResources() {
    const sharedDir = path.join(this.config.outputDir, 'shared');
    await fs.mkdir(sharedDir, { recursive: true });
    
    // Generate search index
    await this.generateSearchIndex(sharedDir);
    
    // Generate sitemap
    await this.generateSitemap(sharedDir);
    
    // Generate API collection
    await this.generateAPICollection(sharedDir);
    
    // Generate version index
    await this.generateVersionIndex(sharedDir);
  }

  /**
   * Helper methods
   */
  async getModuleList() {
    try {
      const modulesDir = 'docs/modules';
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      console.warn('Could not read modules directory:', error.message);
      return [];
    }
  }

  async readModuleFile(modulePath, fileName) {
    try {
      return await fs.readFile(path.join(modulePath, fileName), 'utf8');
    } catch (error) {
      return null;
    }
  }

  shouldIncludeForAudience(fileName, audience) {
    const classification = this.config.contentClassification;
    
    if (classification.public.includes(fileName) && audience === 'public') return true;
    if (classification.internal.includes(fileName) && audience === 'internal') return true;
    if (classification.hybrid.includes(fileName)) return true;
    if (classification.conditional.includes(fileName)) {
      // Add logic for conditional inclusion
      return audience !== 'public'; // Example: exclude from public for now
    }
    
    return false;
  }

  addPublicDisclaimers(content) {
    const disclaimer = `
> **Note**: This is public documentation for the Q Ecosystem. For internal operational procedures, please refer to the internal documentation portal.

`;
    return disclaimer + content;
  }

  addPublicEnhancements(content, module) {
    // Add public-specific enhancements like community links, support info, etc.
    const enhancements = `

## Community and Support

- **Documentation**: [docs.q-ecosystem.com](https://docs.q-ecosystem.com)
- **Community Forum**: [forum.q-ecosystem.com](https://forum.q-ecosystem.com)
- **GitHub**: [github.com/anarq/${module}](https://github.com/anarq/${module})
- **Support**: [support@q-ecosystem.com](mailto:support@q-ecosystem.com)

`;
    return content + enhancements;
  }

  addInternalEnhancements(content, module) {
    // Add internal-specific enhancements
    const enhancements = `

## Internal Resources

- **Runbook**: [Internal Runbook](./runbook.html)
- **Monitoring**: [Grafana Dashboard](https://grafana.internal.q-ecosystem.com/d/${module})
- **Logs**: [Kibana Logs](https://kibana.internal.q-ecosystem.com/app/discover#/${module})
- **On-Call**: [PagerDuty](https://q-ecosystem.pagerduty.com/services/${module})

`;
    return content + enhancements;
  }

  addPartnerEnhancements(content, module) {
    // Add partner-specific enhancements
    const enhancements = `

## Partner Resources

- **Integration Support**: [partner-support@q-ecosystem.com](mailto:partner-support@q-ecosystem.com)
- **Partner Portal**: [partners.q-ecosystem.com](https://partners.q-ecosystem.com)
- **Certification**: [certification.q-ecosystem.com](https://certification.q-ecosystem.com)

`;
    return content + enhancements;
  }

  addOperationalContext(content, module) {
    // Add operational context for internal users
    const context = `

## Operational Context

- **Service Owner**: ${module}-team@q-ecosystem.com
- **SLA**: 99.9% availability
- **Dependencies**: See [Integration Matrix](../integration/integration-matrix.html)
- **Deployment**: Automated via GitHub Actions

`;
    return content + context;
  }

  async getHTMLTemplate(audience) {
    const templatePath = path.join('portal-templates', `${audience}.html`);
    
    try {
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      // Return basic template if specific template not found
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - Q Ecosystem Documentation</title>
    <link rel="stylesheet" href="/assets/css/{{THEME}}.css">
</head>
<body class="{{AUDIENCE}}">
    <header>
        <nav>{{NAVIGATION}}</nav>
    </header>
    <main>
        <article>
            {{CONTENT}}
        </article>
    </main>
    <footer>
        {{FOOTER}}
    </footer>
    <script src="/assets/js/portal.js"></script>
</body>
</html>`;
    }
  }

  generatePageTitle(section, page) {
    return `${section.charAt(0).toUpperCase() + section.slice(1)} - ${page.charAt(0).toUpperCase() + page.slice(1)}`;
  }

  async generatePageNavigation(audience) {
    // Generate navigation HTML for the audience
    return `<ul class="nav">
      <li><a href="/">Home</a></li>
      <li><a href="/modules">Modules</a></li>
      <li><a href="/guides">Guides</a></li>
      <li><a href="/api">API</a></li>
      <li><a href="/examples">Examples</a></li>
    </ul>`;
  }

  async generatePageFooter(audience) {
    return `<p>&copy; 2024 Q Ecosystem. Generated by portal-generator.</p>`;
  }

  // Placeholder implementations for complex methods
  async generateMainOverview(audience) { return `# Q Ecosystem - ${audience} Documentation`; }
  async generateArchitectureOverview(audience) { return `# Architecture Overview`; }
  async generateGettingStarted(audience) { return `# Getting Started`; }
  async generateFAQ(audience) { return `# Frequently Asked Questions`; }
  async generateModuleQuickStart(module, audience) { return `# ${module} Quick Start`; }
  async getModuleOpenAPISpec(module) { return null; }
  async generateInteractiveAPI(spec, audience) { return null; }
  async generateAPIExamples(module, audience) { return []; }
  async generateAuthGuide(module, audience) { return `# Authentication Guide`; }
  async generateQuickStartExamples(audience) { return []; }
  async generateIntegrationExamples(audience) { return []; }
  async generateAdvancedExamples(audience) { return []; }
  async generateTutorials(audience) { return []; }
  async generateChangelog(audience) { return {}; }
  async generatePortalIndexPage(structure, audience) { return `<h1>${audience} Portal</h1>`; }
  async generateMainNavigation(structure, audience) { return {}; }
  async generateSidebarNavigation(structure, audience) { return {}; }
  async generateBreadcrumbNavigation(structure, audience) { return {}; }
  async copyDirectory(src, dest) { /* Implementation */ }
  async generateSearchIndex(dir) { /* Implementation */ }
  async generateSitemap(dir) { /* Implementation */ }
  async generateAPICollection(dir) { /* Implementation */ }
  async generateVersionIndex(dir) { /* Implementation */ }
  async generatePortalIndex() { /* Implementation */ }
}

// CLI interface
async function main() {
  const generator = new PortalGenerator();
  await generator.init();

  const command = process.argv[2];

  switch (command) {
    case 'build':
      await generator.generateCompletePortal();
      break;
    
    case 'audience':
      const audience = process.argv[3];
      if (!audience || !generator.config.audiences[audience]) {
        console.error('Please specify a valid audience: public, internal, or partner');
        process.exit(1);
      }
      
      await generator.generateAudiencePortal(audience, generator.config.audiences[audience]);
      break;
    
    case 'preview':
      console.log('🔍 Portal preview functionality coming soon');
      break;
    
    case 'deploy':
      console.log('🚀 Portal deployment functionality coming soon');
      break;
    
    default:
      console.log(`
Usage: node portal-generator.mjs <command> [args]

Commands:
  build                    - Generate complete portal for all audiences
  audience <audience>      - Generate portal for specific audience
  preview                  - Preview portal locally
  deploy                   - Deploy portal to production

Audiences:
  public                   - External developers and users
  internal                 - Internal teams and operations
  partner                  - Integration partners

Examples:
  node portal-generator.mjs build
  node portal-generator.mjs audience public
  node portal-generator.mjs preview
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Portal generation failed:', error);
    process.exit(1);
  });
}

export default PortalGenerator;