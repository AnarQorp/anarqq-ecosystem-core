#!/usr/bin/env node

/**
 * Video Script Generation System
 * Creates bilingual video scripts for ecosystem overview and individual modules
 * Supports English and Spanish with visual cues and production notes
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { VisualAssetManager } from './VisualAssetManager.mjs';

export class ScriptGenerator {
  constructor() {
    this.modules = [];
    this.globalContent = {};
    this.templates = {};
    this.generatedScripts = [];
    this.errors = [];
    this.warnings = [];
    this.assetManager = new VisualAssetManager();
  }

  /**
   * Initialize the script generator
   */
  async init() {
    console.log('🎬 Initializing Script Generator...');
    
    await this.assetManager.init();
    await this.loadModules();
    await this.loadGlobalContent();
    await this.loadTemplates();
    
    console.log(`✅ Initialized with ${this.modules.length} modules`);
  }

  /**
   * Load all modules from the ecosystem
   */
  async loadModules() {
    try {
      const modulesDir = 'docs/modules';
      const moduleNames = await fs.readdir(modulesDir);
      
      for (const moduleName of moduleNames) {
        if (moduleName === 'README.md') continue;
        
        const moduleDir = path.join(modulesDir, moduleName);
        const stat = await fs.stat(moduleDir);
        
        if (stat.isDirectory()) {
          const module = await this.loadModuleInfo(moduleName, moduleDir);
          if (module) {
            this.modules.push(module);
          }
        }
      }
      
      // Sort modules alphabetically for consistent ordering
      this.modules.sort((a, b) => a.name.localeCompare(b.name));
      
    } catch (error) {
      this.errors.push(`Failed to load modules: ${error.message}`);
    }
  }

  /**
   * Load information for a specific module
   */
  async loadModuleInfo(moduleName, moduleDir) {
    try {
      const readmePath = path.join(moduleDir, 'README.md');
      const content = await fs.readFile(readmePath, 'utf8');
      
      // Parse front matter and content
      const { metadata, body } = this.parseDocument(content);
      
      // Extract key information
      const module = {
        name: moduleName,
        displayName: this.formatModuleName(moduleName),
        description: this.extractDescription(body),
        keyFeatures: this.extractKeyFeatures(body),
        endpoints: this.extractEndpointCount(body),
        mcpTools: this.extractMcpToolCount(body),
        integrations: this.extractIntegrations(body),
        useCases: this.extractUseCases(body),
        metadata: metadata || {}
      };
      
      return module;
    } catch (error) {
      this.warnings.push(`Could not load module info for ${moduleName}: ${error.message}`);
      return null;
    }
  } 
 /**
   * Load global ecosystem content
   */
  async loadGlobalContent() {
    try {
      // Load vision overview
      const visionPath = 'docs/global/vision/vision-overview.md';
      const visionContent = await fs.readFile(visionPath, 'utf8');
      this.globalContent.vision = this.parseDocument(visionContent);
      
      // Load architecture overview
      const archPath = 'docs/global/architecture/q-infinity-architecture.md';
      const archContent = await fs.readFile(archPath, 'utf8');
      this.globalContent.architecture = this.parseDocument(archContent);
      
      // Load strategic narrative
      const strategyPath = 'docs/global/strategy/strategic-narrative.md';
      const strategyContent = await fs.readFile(strategyPath, 'utf8');
      this.globalContent.strategy = this.parseDocument(strategyContent);
      
      // Load main README for ecosystem overview
      const readmePath = 'docs/README.md';
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      this.globalContent.overview = this.parseDocument(readmeContent);
      
    } catch (error) {
      this.errors.push(`Failed to load global content: ${error.message}`);
    }
  }

  /**
   * Load script templates
   */
  async loadTemplates() {
    this.templates = {
      global: {
        en: this.getGlobalTemplateEN(),
        es: this.getGlobalTemplateES()
      },
      module: {
        en: this.getModuleTemplateEN(),
        es: this.getModuleTemplateES()
      }
    };
  }

  /**
   * Generate global ecosystem video script
   */
  async generateGlobalScript(language = 'en') {
    console.log(`🌍 Generating global ecosystem script in ${language.toUpperCase()}...`);
    
    try {
      const template = this.templates.global[language];
      if (!template) {
        throw new Error(`Template not found for language: ${language}`);
      }
      
      // Extract key content from global documentation
      const ecosystemBenefits = this.extractEcosystemBenefits();
      const moduleOverview = this.generateModuleOverview(language);
      const useCases = this.extractGlobalUseCases();
      const architecture = this.extractArchitectureHighlights();
      
      // Generate script content
      const script = {
        title: language === 'en' ? 'AnarQ&Q Ecosystem Overview' : 'Visión General del Ecosistema AnarQ&Q',
        duration: '5-7 minutes',
        language: language,
        targetAudience: 'general',
        sections: [
          this.generateIntroSection(language),
          this.generateProblemSection(language),
          this.generateSolutionSection(language, ecosystemBenefits),
          this.generateArchitectureSection(language, architecture),
          this.generateModulesSection(language, moduleOverview),
          this.generateUseCasesSection(language, useCases),
          this.generateCallToActionSection(language)
        ],
        visualCues: this.generateGlobalVisualCues(language),
        metadata: {
          version: '1.0.0',
          author: 'Q Ecosystem Team',
          reviewStatus: 'draft',
          assets: this.generateAssetReferences('global'),
          shotList: this.generateShotList('global', language)
        }
      };
      
      // Validate script structure
      const validation = this.validateScriptStructure(script);
      if (validation.errors.length > 0) {
        this.errors.push(`Global script validation failed: ${validation.errors.join(', ')}`);
        return null;
      }
      
      this.generatedScripts.push({
        type: 'global',
        language: language,
        script: script
      });
      
      console.log(`✅ Generated global script in ${language.toUpperCase()}`);
      return script;
      
    } catch (error) {
      this.errors.push(`Failed to generate global script in ${language}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate module-specific video script
   */
  async generateModuleScript(moduleName, language = 'en') {
    console.log(`📦 Generating ${moduleName} script in ${language.toUpperCase()}...`);
    
    try {
      const module = this.modules.find(m => m.name === moduleName);
      if (!module) {
        throw new Error(`Module not found: ${moduleName}`);
      }
      
      const template = this.templates.module[language];
      if (!template) {
        throw new Error(`Template not found for language: ${language}`);
      }
      
      // Generate script content
      const script = {
        title: language === 'en' 
          ? `${module.displayName} - ${module.description}` 
          : `${module.displayName} - ${this.translateDescription(module.description, language)}`,
        duration: '2-3 minutes',
        language: language,
        targetAudience: 'developers',
        module: moduleName,
        sections: [
          this.generateModuleIntroSection(module, language),
          this.generateModulePurposeSection(module, language),
          this.generateModuleFeaturesSection(module, language),
          this.generateModuleIntegrationSection(module, language),
          this.generateModuleUseCasesSection(module, language),
          this.generateModuleCallToActionSection(module, language)
        ],
        visualCues: this.generateModuleVisualCues(module, language),
        metadata: {
          version: '1.0.0',
          author: 'Q Ecosystem Team',
          reviewStatus: 'draft',
          module: moduleName,
          assets: this.generateAssetReferences(moduleName),
          shotList: this.generateShotList(moduleName, language)
        }
      };
      
      // Validate script structure
      const validation = this.validateScriptStructure(script);
      if (validation.errors.length > 0) {
        this.errors.push(`${moduleName} script validation failed: ${validation.errors.join(', ')}`);
        return null;
      }
      
      this.generatedScripts.push({
        type: 'module',
        module: moduleName,
        language: language,
        script: script
      });
      
      console.log(`✅ Generated ${moduleName} script in ${language.toUpperCase()}`);
      return script;
      
    } catch (error) {
      this.errors.push(`Failed to generate ${moduleName} script in ${language}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate all scripts (global + all modules) in both languages
   */
  async generateAllScripts() {
    console.log('🎬 Generating all video scripts...');
    
    const languages = ['en', 'es'];
    
    // Generate global scripts
    for (const language of languages) {
      await this.generateGlobalScript(language);
    }
    
    // Generate module scripts
    for (const module of this.modules) {
      for (const language of languages) {
        await this.generateModuleScript(module.name, language);
      }
    }
    
    console.log(`✅ Generated ${this.generatedScripts.length} scripts total`);
    
    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} errors occurred:`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} warnings:`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }

  /**
   * Save all generated scripts to files
   */
  async saveAllScripts() {
    console.log('💾 Saving generated scripts...');
    
    // Create output directories
    await fs.mkdir('docs/video-scripts', { recursive: true });
    await fs.mkdir('docs/video-scripts/global', { recursive: true });
    await fs.mkdir('docs/video-scripts/modules', { recursive: true });
    
    for (const generated of this.generatedScripts) {
      const { type, language, script, module } = generated;
      
      let filePath;
      if (type === 'global') {
        filePath = `docs/video-scripts/global/ecosystem-overview-${language}.md`;
      } else {
        filePath = `docs/video-scripts/modules/${module}-${language}.md`;
      }
      
      const content = this.formatScriptAsMarkdown(script);
      await fs.writeFile(filePath, content, 'utf8');
      
      console.log(`  ✅ Saved: ${filePath}`);
    }
    
    // Generate index file
    await this.generateScriptIndex();
    
    console.log(`💾 Saved ${this.generatedScripts.length} script files`);
  }

  /**
   * Generate script index file
   */
  async generateScriptIndex() {
    const indexContent = `# Video Scripts Index

## Global Ecosystem Scripts

- [English - Ecosystem Overview](./global/ecosystem-overview-en.md)
- [Spanish - Visión General del Ecosistema](./global/ecosystem-overview-es.md)

## Module Scripts

### English Scripts
${this.modules.map(module => 
  `- [${module.displayName}](./modules/${module.name}-en.md)`
).join('\n')}

### Spanish Scripts
${this.modules.map(module => 
  `- [${module.displayName}](./modules/${module.name}-es.md)`
).join('\n')}

## Production Notes

### Duration Guidelines
- **Global Scripts**: 5-7 minutes target duration
- **Module Scripts**: 2-3 minutes target duration

### Visual Assets
All scripts include:
- Visual cue timestamps
- Asset references (IPFS CIDs, S3 URLs)
- Standardized shot lists
- Production notes

### Languages
- **English**: Primary language for global audience
- **Spanish**: Secondary language for Latin American markets

---
*Generated automatically by ScriptGenerator*
*Last updated: ${new Date().toISOString()}*
`;

    await fs.writeFile('docs/video-scripts/README.md', indexContent, 'utf8');
  } 
 // Template Methods

  /**
   * Get global script template in English
   */
  getGlobalTemplateEN() {
    return {
      intro: {
        hook: "What if you could take complete control of your digital life?",
        problem: "Today's internet is controlled by a few giant corporations who own your data, decide what you can see, and profit from your digital activity.",
        solution: "AnarQ&Q changes everything with a complete ecosystem of decentralized applications that put you back in control."
      },
      architecture: {
        title: "The Q∞ Architecture",
        description: "Built on our revolutionary Q-Infinity architecture, AnarQ&Q provides infinite scalability, universal interoperability, and complete user sovereignty."
      },
      modules: {
        title: "14 Powerful Modules",
        description: "From identity management to payments, from secure messaging to decentralized storage - everything you need for digital sovereignty."
      },
      benefits: {
        title: "Why AnarQ&Q?",
        points: [
          "Complete control over your data and digital identity",
          "Military-grade security without complexity",
          "Seamless integration across all services",
          "True decentralization with no single point of failure"
        ]
      },
      callToAction: {
        title: "Join the Revolution",
        message: "Ready to take control of your digital life? Join thousands of users already building the future with AnarQ&Q.",
        action: "Get started today at q.network"
      }
    };
  }

  /**
   * Get global script template in Spanish
   */
  getGlobalTemplateES() {
    return {
      intro: {
        hook: "¿Qué pasaría si pudieras tomar control completo de tu vida digital?",
        problem: "El internet de hoy está controlado por unas pocas corporaciones gigantes que poseen tus datos, deciden qué puedes ver, y se benefician de tu actividad digital.",
        solution: "AnarQ&Q lo cambia todo con un ecosistema completo de aplicaciones descentralizadas que te devuelven el control."
      },
      architecture: {
        title: "La Arquitectura Q∞",
        description: "Construido sobre nuestra revolucionaria arquitectura Q-Infinito, AnarQ&Q proporciona escalabilidad infinita, interoperabilidad universal, y soberanía completa del usuario."
      },
      modules: {
        title: "14 Módulos Poderosos",
        description: "Desde gestión de identidad hasta pagos, desde mensajería segura hasta almacenamiento descentralizado - todo lo que necesitas para la soberanía digital."
      },
      benefits: {
        title: "¿Por qué AnarQ&Q?",
        points: [
          "Control completo sobre tus datos e identidad digital",
          "Seguridad de grado militar sin complejidad",
          "Integración perfecta entre todos los servicios",
          "Verdadera descentralización sin punto único de falla"
        ]
      },
      callToAction: {
        title: "Únete a la Revolución",
        message: "¿Listo para tomar control de tu vida digital? Únete a miles de usuarios que ya están construyendo el futuro con AnarQ&Q.",
        action: "Comienza hoy en q.network"
      }
    };
  }

  /**
   * Get module script template in English
   */
  getModuleTemplateEN() {
    return {
      intro: {
        hook: "Meet {MODULE_NAME} - {DESCRIPTION}",
        context: "Part of the AnarQ&Q ecosystem, {MODULE_NAME} provides {PURPOSE} with complete user control and seamless integration."
      },
      purpose: {
        title: "What {MODULE_NAME} Does",
        description: "{DETAILED_PURPOSE}"
      },
      features: {
        title: "Key Features",
        list: "{FEATURE_LIST}"
      },
      integration: {
        title: "Ecosystem Integration",
        description: "Works seamlessly with {RELATED_MODULES} to provide a complete solution."
      },
      useCases: {
        title: "Real-World Use Cases",
        examples: "{USE_CASE_EXAMPLES}"
      },
      callToAction: {
        title: "Get Started with {MODULE_NAME}",
        message: "Ready to experience {BENEFITS}?",
        action: "Try {MODULE_NAME} today as part of the AnarQ&Q ecosystem."
      }
    };
  }

  /**
   * Get module script template in Spanish
   */
  getModuleTemplateES() {
    return {
      intro: {
        hook: "Conoce {MODULE_NAME} - {DESCRIPTION}",
        context: "Parte del ecosistema AnarQ&Q, {MODULE_NAME} proporciona {PURPOSE} con control completo del usuario e integración perfecta."
      },
      purpose: {
        title: "Qué hace {MODULE_NAME}",
        description: "{DETAILED_PURPOSE}"
      },
      features: {
        title: "Características Clave",
        list: "{FEATURE_LIST}"
      },
      integration: {
        title: "Integración del Ecosistema",
        description: "Funciona perfectamente con {RELATED_MODULES} para proporcionar una solución completa."
      },
      useCases: {
        title: "Casos de Uso del Mundo Real",
        examples: "{USE_CASE_EXAMPLES}"
      },
      callToAction: {
        title: "Comienza con {MODULE_NAME}",
        message: "¿Listo para experimentar {BENEFITS}?",
        action: "Prueba {MODULE_NAME} hoy como parte del ecosistema AnarQ&Q."
      }
    };
  }

  // Content Generation Methods

  /**
   * Generate introduction section for global script
   */
  generateIntroSection(language) {
    const template = this.templates.global[language];
    
    return {
      title: language === 'en' ? 'Introduction' : 'Introducción',
      content: template.intro.hook + '\n\n' + template.intro.problem + '\n\n' + template.intro.solution,
      duration: '60 seconds',
      visualSuggestions: [
        'Split screen showing centralized vs decentralized networks',
        'User frustrated with privacy settings',
        'AnarQ&Q logo animation with ecosystem modules appearing'
      ],
      keyPoints: [
        language === 'en' ? 'Current internet problems' : 'Problemas del internet actual',
        language === 'en' ? 'AnarQ&Q solution' : 'Solución AnarQ&Q'
      ]
    };
  }

  /**
   * Generate problem section for global script
   */
  generateProblemSection(language) {
    const problems = language === 'en' ? [
      'Your data is owned and monetized by corporations',
      'Privacy settings are complex and often ignored',
      'Services can be shut down or censored at any time',
      'You have no real control over your digital identity'
    ] : [
      'Tus datos son propiedad y monetizados por corporaciones',
      'Las configuraciones de privacidad son complejas y a menudo ignoradas',
      'Los servicios pueden ser cerrados o censurados en cualquier momento',
      'No tienes control real sobre tu identidad digital'
    ];

    return {
      title: language === 'en' ? 'The Problem' : 'El Problema',
      content: problems.join('\n\n'),
      duration: '45 seconds',
      visualSuggestions: [
        'Data being harvested from users',
        'Services being shut down',
        'Complex privacy settings screens',
        'User data being sold to advertisers'
      ],
      keyPoints: problems
    };
  }

  /**
   * Generate solution section for global script
   */
  generateSolutionSection(language, benefits) {
    return {
      title: language === 'en' ? 'The AnarQ&Q Solution' : 'La Solución AnarQ&Q',
      content: benefits.join('\n\n'),
      duration: '90 seconds',
      visualSuggestions: [
        'Q∞ architecture diagram animation',
        'User controlling their own data',
        'Seamless integration between modules',
        'Decentralized network visualization'
      ],
      keyPoints: benefits
    };
  }

  /**
   * Generate architecture section for global script
   */
  generateArchitectureSection(language, architecture) {
    const template = this.templates.global[language];
    
    return {
      title: template.architecture.title,
      content: template.architecture.description + '\n\n' + architecture.join('\n\n'),
      duration: '75 seconds',
      visualSuggestions: [
        'Q∞ architecture diagram with layers',
        'Infinite scalability visualization',
        'Cross-chain interoperability demo',
        'User sovereignty illustration'
      ],
      keyPoints: architecture
    };
  }

  /**
   * Generate modules section for global script
   */
  generateModulesSection(language, moduleOverview) {
    const template = this.templates.global[language];
    
    return {
      title: template.modules.title,
      content: template.modules.description + '\n\n' + moduleOverview,
      duration: '120 seconds',
      visualSuggestions: [
        'Module icons appearing in sequence',
        'Integration lines connecting modules',
        'User journey across multiple modules',
        'Ecosystem completeness visualization'
      ],
      keyPoints: [
        language === 'en' ? '14 integrated modules' : '14 módulos integrados',
        language === 'en' ? 'Complete digital infrastructure' : 'Infraestructura digital completa',
        language === 'en' ? 'Seamless interoperability' : 'Interoperabilidad perfecta'
      ]
    };
  }

  /**
   * Generate use cases section for global script
   */
  generateUseCasesSection(language, useCases) {
    return {
      title: language === 'en' ? 'Real-World Use Cases' : 'Casos de Uso del Mundo Real',
      content: useCases.join('\n\n'),
      duration: '90 seconds',
      visualSuggestions: [
        'User scenarios and workflows',
        'Before/after comparisons',
        'Success stories and testimonials',
        'Different user types (individual, enterprise, developer)'
      ],
      keyPoints: useCases
    };
  }

  /**
   * Generate call to action section for global script
   */
  generateCallToActionSection(language) {
    const template = this.templates.global[language];
    
    return {
      title: template.callToAction.title,
      content: template.callToAction.message + '\n\n' + template.callToAction.action,
      duration: '30 seconds',
      visualSuggestions: [
        'Call to action overlay',
        'Website URL and QR code',
        'Community stats and growth',
        'Getting started steps'
      ],
      keyPoints: [
        template.callToAction.action,
        language === 'en' ? 'Join the community' : 'Únete a la comunidad',
        language === 'en' ? 'Start building today' : 'Comienza a construir hoy'
      ]
    };
  }  
// Module-specific section generators

  /**
   * Generate module introduction section
   */
  generateModuleIntroSection(module, language) {
    const template = this.templates.module[language];
    const hook = template.intro.hook
      .replace('{MODULE_NAME}', module.displayName)
      .replace('{DESCRIPTION}', language === 'es' ? this.translateDescription(module.description, language) : module.description);
    
    const context = template.intro.context
      .replace('{MODULE_NAME}', module.displayName)
      .replace('{PURPOSE}', this.extractPurpose(module, language));

    return {
      title: language === 'en' ? 'Introduction' : 'Introducción',
      content: hook + '\n\n' + context,
      duration: '30 seconds',
      visualSuggestions: [
        `${module.displayName} logo and branding`,
        'Module interface screenshots',
        'Integration with ecosystem visualization'
      ],
      keyPoints: [
        module.displayName,
        language === 'es' ? this.translateDescription(module.description, language) : module.description
      ]
    };
  }

  /**
   * Generate module purpose section
   */
  generateModulePurposeSection(module, language) {
    const purpose = this.extractDetailedPurpose(module, language);
    
    return {
      title: language === 'en' ? `What ${module.displayName} Does` : `Qué hace ${module.displayName}`,
      content: purpose,
      duration: '45 seconds',
      visualSuggestions: [
        'Core functionality demonstration',
        'Problem/solution visualization',
        'Key capabilities overview'
      ],
      keyPoints: [
        language === 'en' ? 'Primary purpose' : 'Propósito principal',
        language === 'en' ? 'Core capabilities' : 'Capacidades principales'
      ]
    };
  }

  /**
   * Generate module features section
   */
  generateModuleFeaturesSection(module, language) {
    const features = language === 'es' ? 
      module.keyFeatures.map(f => this.translateFeature(f, language)) : 
      module.keyFeatures;
    
    return {
      title: language === 'en' ? 'Key Features' : 'Características Clave',
      content: features.join('\n\n'),
      duration: '60 seconds',
      visualSuggestions: [
        'Feature demonstrations',
        'UI/UX walkthroughs',
        'Technical capabilities showcase'
      ],
      keyPoints: features
    };
  }

  /**
   * Generate module integration section
   */
  generateModuleIntegrationSection(module, language) {
    const integrations = this.getModuleIntegrations(module, language);
    
    return {
      title: language === 'en' ? 'Ecosystem Integration' : 'Integración del Ecosistema',
      content: integrations,
      duration: '45 seconds',
      visualSuggestions: [
        'Module connection diagram',
        'Data flow visualization',
        'Cross-module workflows'
      ],
      keyPoints: [
        language === 'en' ? 'Seamless integration' : 'Integración perfecta',
        language === 'en' ? 'Cross-module workflows' : 'Flujos entre módulos'
      ]
    };
  }

  /**
   * Generate module use cases section
   */
  generateModuleUseCasesSection(module, language) {
    const useCases = this.extractModuleUseCases(module, language);
    
    return {
      title: language === 'en' ? 'Real-World Use Cases' : 'Casos de Uso del Mundo Real',
      content: useCases.join('\n\n'),
      duration: '45 seconds',
      visualSuggestions: [
        'User scenario demonstrations',
        'Real-world applications',
        'Success stories'
      ],
      keyPoints: useCases
    };
  }

  /**
   * Generate module call to action section
   */
  generateModuleCallToActionSection(module, language) {
    const benefits = this.extractModuleBenefits(module, language);
    
    return {
      title: language === 'en' ? `Get Started with ${module.displayName}` : `Comienza con ${module.displayName}`,
      content: language === 'en' ? 
        `Ready to experience ${benefits}?\n\nTry ${module.displayName} today as part of the AnarQ&Q ecosystem.` :
        `¿Listo para experimentar ${benefits}?\n\nPrueba ${module.displayName} hoy como parte del ecosistema AnarQ&Q.`,
      duration: '15 seconds',
      visualSuggestions: [
        'Call to action overlay',
        'Getting started steps',
        'Documentation and resources'
      ],
      keyPoints: [
        language === 'en' ? 'Try today' : 'Prueba hoy',
        language === 'en' ? 'Part of ecosystem' : 'Parte del ecosistema'
      ]
    };
  }

  // Visual Cues and Assets

  /**
   * Generate visual cues for global script
   */
  generateGlobalVisualCues(language) {
    return [
      {
        timestamp: '0:00',
        type: 'animation',
        description: language === 'en' ? 'AnarQ&Q logo reveal with ecosystem modules' : 'Revelación del logo AnarQ&Q con módulos del ecosistema',
        source: 'cid://Qm...'
      },
      {
        timestamp: '0:30',
        type: 'diagram',
        description: language === 'en' ? 'Centralized vs Decentralized comparison' : 'Comparación Centralizado vs Descentralizado',
        source: 'cid://Qm...'
      },
      {
        timestamp: '1:30',
        type: 'animation',
        description: language === 'en' ? 'Q∞ architecture layers animation' : 'Animación de capas de arquitectura Q∞',
        source: 'cid://Qm...'
      },
      {
        timestamp: '3:00',
        type: 'screenshot',
        description: language === 'en' ? 'Module integration demonstration' : 'Demostración de integración de módulos',
        source: 's3://assets/screenshots/integration-demo.png'
      },
      {
        timestamp: '5:00',
        type: 'animation',
        description: language === 'en' ? 'User journey across ecosystem' : 'Viaje del usuario a través del ecosistema',
        source: 'cid://Qm...'
      }
    ];
  }

  /**
   * Generate visual cues for module script
   */
  generateModuleVisualCues(module, language) {
    return [
      {
        timestamp: '0:00',
        type: 'animation',
        description: `${module.displayName} ${language === 'en' ? 'logo and branding' : 'logo y marca'}`,
        source: `cid://Qm${module.name}Logo`
      },
      {
        timestamp: '0:30',
        type: 'screenshot',
        description: `${module.displayName} ${language === 'en' ? 'interface walkthrough' : 'recorrido de interfaz'}`,
        source: `s3://assets/screenshots/${module.name}-interface.png`
      },
      {
        timestamp: '1:00',
        type: 'diagram',
        description: `${module.displayName} ${language === 'en' ? 'architecture diagram' : 'diagrama de arquitectura'}`,
        source: `cid://Qm${module.name}Arch`
      },
      {
        timestamp: '1:30',
        type: 'animation',
        description: language === 'en' ? 'Integration with other modules' : 'Integración con otros módulos',
        source: `cid://Qm${module.name}Integration`
      },
      {
        timestamp: '2:00',
        type: 'screenshot',
        description: language === 'en' ? 'Real-world use case demo' : 'Demo de caso de uso del mundo real',
        source: `s3://assets/screenshots/${module.name}-usecase.png`
      }
    ];
  }

  /**
   * Generate asset references using Visual Asset Manager
   */
  generateAssetReferences(type) {
    // Get assets from Visual Asset Manager
    const manifest = this.assetManager.generateAssetManifest(type === 'global' ? 'global' : 'module', type);
    
    const assetRefs = [];
    
    // Add base branding assets
    assetRefs.push('cid://QmAnarQQLogo');
    assetRefs.push('s3://q-ecosystem-assets/branding/logo-variants.zip');
    
    // Add diagrams
    manifest.assets.diagrams.forEach(diagram => {
      if (diagram.ipfsCid) {
        assetRefs.push(`cid://${diagram.ipfsCid}`);
      } else {
        assetRefs.push(`s3://q-ecosystem-assets/diagrams/${diagram.name}.svg`);
      }
    });
    
    // Add icons and logos
    manifest.assets.icons.forEach(icon => {
      if (icon.ipfsCid) {
        assetRefs.push(`cid://${icon.ipfsCid}`);
      } else {
        assetRefs.push(`s3://q-ecosystem-assets/icons/${icon.name}`);
      }
    });

    if (type === 'global') {
      return [
        ...assetRefs,
        'cid://QmGlobalOverview',
        's3://assets/animations/ecosystem-overview.mp4',
        'cid://QmModuleIntegration',
        's3://assets/screenshots/ecosystem-dashboard.png'
      ];
    } else {
      return [
        ...baseAssets,
        `cid://Qm${type}Assets`,
        `s3://assets/modules/${type}/screenshots.zip`,
        `s3://assets/modules/${type}/diagrams.zip`
      ];
    }
  }

  /**
   * Generate standardized shot list
   */
  generateShotList(type, language) {
    const baseShots = [
      language === 'en' ? 'Opening title card' : 'Tarjeta de título de apertura',
      language === 'en' ? 'Logo animation' : 'Animación del logo',
      language === 'en' ? 'Problem statement visuals' : 'Visuales de declaración del problema',
      language === 'en' ? 'Solution demonstration' : 'Demostración de la solución',
      language === 'en' ? 'Call to action' : 'Llamada a la acción'
    ];

    if (type === 'global') {
      return [
        ...baseShots,
        language === 'en' ? 'Architecture overview' : 'Visión general de la arquitectura',
        language === 'en' ? 'Module showcase' : 'Exhibición de módulos',
        language === 'en' ? 'Use case scenarios' : 'Escenarios de casos de uso',
        language === 'en' ? 'Community and ecosystem' : 'Comunidad y ecosistema'
      ];
    } else {
      return [
        ...baseShots,
        language === 'en' ? 'Module interface demo' : 'Demo de interfaz del módulo',
        language === 'en' ? 'Feature highlights' : 'Destacados de características',
        language === 'en' ? 'Integration examples' : 'Ejemplos de integración'
      ];
    }
  } 
 // Validation Methods

  /**
   * Validate script structure and content
   */
  validateScriptStructure(script) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!script.title) errors.push('Missing script title');
    if (!script.duration) errors.push('Missing script duration');
    if (!script.language) errors.push('Missing script language');
    if (!script.sections || script.sections.length === 0) errors.push('Missing script sections');

    // Validate duration
    if (script.duration) {
      const isGlobal = script.duration.includes('5-7');
      const isModule = script.duration.includes('2-3');
      
      if (!isGlobal && !isModule) {
        warnings.push('Duration should be 5-7 minutes for global or 2-3 minutes for module scripts');
      }
    }

    // Validate sections
    if (script.sections) {
      let totalEstimatedDuration = 0;
      
      for (const section of script.sections) {
        if (!section.title) errors.push('Section missing title');
        if (!section.content) errors.push('Section missing content');
        if (!section.duration) warnings.push('Section missing duration estimate');
        
        // Estimate duration from content length (rough calculation)
        if (section.content) {
          const wordCount = section.content.split(' ').length;
          const estimatedSeconds = Math.ceil(wordCount / 2.5); // ~150 words per minute
          totalEstimatedDuration += estimatedSeconds;
        }
      }
      
      // Check if total duration is reasonable
      const targetSeconds = script.duration.includes('5-7') ? 360 : 150; // 6 min or 2.5 min
      if (Math.abs(totalEstimatedDuration - targetSeconds) > 60) {
        warnings.push(`Estimated duration (${Math.ceil(totalEstimatedDuration/60)} min) may not match target (${script.duration})`);
      }
    }

    // Validate visual cues
    if (script.visualCues && script.visualCues.length > 0) {
      for (const cue of script.visualCues) {
        if (!cue.timestamp) warnings.push('Visual cue missing timestamp');
        if (!cue.description) warnings.push('Visual cue missing description');
      }
    }

    return { errors, warnings };
  }

  // Utility Methods

  /**
   * Parse document front matter and content
   */
  parseDocument(content) {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (match) {
      try {
        const metadata = yaml.load(match[1]);
        const body = match[2];
        return { metadata, body };
      } catch (error) {
        this.warnings.push(`Failed to parse YAML front matter: ${error.message}`);
      }
    }
    
    return { metadata: {}, body: content };
  }

  /**
   * Format module name for display
   */
  formatModuleName(name) {
    const specialCases = {
      'dao': 'DAO/Communities',
      'qchat': 'Qchat',
      'qdrive': 'Qdrive',
      'qerberos': 'Qerberos',
      'qindex': 'Qindex',
      'qlock': 'Qlock',
      'qmail': 'Qmail',
      'qmarket': 'Qmarket',
      'qmask': 'Qmask',
      'qnet': 'QNET',
      'qonsent': 'Qonsent',
      'qpic': 'QpiC',
      'qwallet': 'Qwallet',
      'squid': 'sQuid'
    };
    
    return specialCases[name] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Extract description from module content
   */
  extractDescription(content) {
    // Look for description in various patterns
    const patterns = [
      /## Overview\s*\n\s*([^\n]+)/,
      /^([^\n]+Module for [^\n]+)/m,
      /^([^\n]+API[^\n]*)/m,
      /^([^\n]+for [^\n]+ ecosystem[^\n]*)/mi
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Q Ecosystem Module';
  }

  /**
   * Extract key features from module content
   */
  extractKeyFeatures(content) {
    const features = [];
    
    // Look for key features section
    const featuresMatch = content.match(/## Key Features\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/);
    if (featuresMatch) {
      const featuresText = featuresMatch[1];
      const bulletPoints = featuresText.match(/- \*\*([^*]+)\*\*/g);
      
      if (bulletPoints) {
        features.push(...bulletPoints.map(point => point.replace(/- \*\*([^*]+)\*\*/, '$1')));
      }
    }
    
    // Fallback: look for common feature patterns
    if (features.length === 0) {
      const commonFeatures = [
        'REST API access',
        'MCP tools integration',
        'Standalone operation',
        'Ecosystem integration',
        'Comprehensive testing'
      ];
      features.push(...commonFeatures);
    }
    
    return features;
  }

  /**
   * Extract endpoint count from content
   */
  extractEndpointCount(content) {
    const match = content.match(/(\d+) HTTP endpoints/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract MCP tool count from content
   */
  extractMcpToolCount(content) {
    const match = content.match(/(\d+) MCP tools/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract integrations from content
   */
  extractIntegrations(content) {
    const integrations = [];
    
    // Look for module names mentioned in content
    const moduleNames = ['squid', 'qindex', 'qerberos', 'qonsent', 'qlock', 'qdrive', 'qmail', 'qchat', 'qmarket', 'qwallet', 'qmask', 'qpic', 'qnet', 'dao'];
    
    for (const moduleName of moduleNames) {
      const regex = new RegExp(`\\b${moduleName}\\b`, 'gi');
      if (regex.test(content)) {
        integrations.push(this.formatModuleName(moduleName));
      }
    }
    
    return integrations;
  }

  /**
   * Extract use cases from content
   */
  extractUseCases(content) {
    const useCases = [];
    
    // Look for use cases section
    const useCasesMatch = content.match(/## Use Cases\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/);
    if (useCasesMatch) {
      const useCasesText = useCasesMatch[1];
      const cases = useCasesText.split('\n').filter(line => line.trim().startsWith('-'));
      useCases.push(...cases.map(c => c.replace(/^-\s*/, '').trim()));
    }
    
    return useCases;
  }

  /**
   * Extract ecosystem benefits
   */
  extractEcosystemBenefits() {
    return [
      'Complete control over your data and digital identity',
      'Military-grade security without complexity',
      'Seamless integration across all services',
      'True decentralization with no single point of failure',
      'Privacy by design with zero-knowledge proofs',
      'Interoperable across multiple blockchains',
      'Community-governed and transparent'
    ];
  }

  /**
   * Generate module overview for global script
   */
  generateModuleOverview(language) {
    const moduleGroups = {
      'Core Identity & Security': ['squid', 'qonsent', 'qlock', 'qerberos', 'qmask'],
      'Storage & Content': ['qdrive', 'qpic', 'qindex'],
      'Communication & Commerce': ['qmail', 'qchat', 'qmarket', 'qwallet'],
      'Infrastructure & Governance': ['qnet', 'dao']
    };

    let overview = '';
    
    for (const [category, modules] of Object.entries(moduleGroups)) {
      const translatedCategory = language === 'es' ? this.translateCategory(category) : category;
      overview += `**${translatedCategory}**\n`;
      
      for (const moduleName of modules) {
        const module = this.modules.find(m => m.name === moduleName);
        if (module) {
          const description = language === 'es' ? 
            this.translateDescription(module.description, language) : 
            module.description;
          overview += `- ${module.displayName}: ${description}\n`;
        }
      }
      overview += '\n';
    }
    
    return overview;
  }

  /**
   * Extract global use cases
   */
  extractGlobalUseCases() {
    return [
      'Individual users taking control of their digital identity and data',
      'Enterprises building secure, compliant applications',
      'Developers creating next-generation decentralized applications',
      'Organizations requiring transparent, auditable systems',
      'Communities governing themselves through decentralized mechanisms'
    ];
  }

  /**
   * Extract architecture highlights
   */
  extractArchitectureHighlights() {
    return [
      'Infinite scalability through horizontal scaling',
      'Universal interoperability across chains and protocols',
      'Modular composability for custom solutions',
      'Self-sovereign identity with user control',
      'Decentralized governance through DAO mechanisms'
    ];
  }

  /**
   * Extract purpose for module
   */
  extractPurpose(module, language) {
    const purposes = {
      'squid': language === 'en' ? 'identity and authentication management' : 'gestión de identidad y autenticación',
      'qwallet': language === 'en' ? 'payments and financial services' : 'pagos y servicios financieros',
      'qchat': language === 'en' ? 'secure instant messaging' : 'mensajería instantánea segura',
      'qdrive': language === 'en' ? 'decentralized file storage' : 'almacenamiento de archivos descentralizado',
      'qmail': language === 'en' ? 'certified messaging' : 'mensajería certificada',
      'qmarket': language === 'en' ? 'content marketplace' : 'mercado de contenido',
      'dao': language === 'en' ? 'decentralized governance' : 'gobernanza descentralizada'
    };
    
    return purposes[module.name] || (language === 'en' ? 'ecosystem services' : 'servicios del ecosistema');
  }

  /**
   * Extract detailed purpose for module
   */
  extractDetailedPurpose(module, language) {
    if (language === 'es') {
      return this.translateDescription(module.description, language) + 
        '. Proporciona funcionalidades esenciales para el ecosistema AnarQ&Q con seguridad de grado empresarial y control total del usuario.';
    }
    
    return module.description + 
      '. Provides essential functionality for the AnarQ&Q ecosystem with enterprise-grade security and complete user control.';
  }

  /**
   * Get module integrations description
   */
  getModuleIntegrations(module, language) {
    const integrations = module.integrations.slice(0, 3); // Top 3 integrations
    
    if (language === 'es') {
      return `${module.displayName} se integra perfectamente con ${integrations.join(', ')} y otros módulos del ecosistema para proporcionar una experiencia unificada.`;
    }
    
    return `${module.displayName} integrates seamlessly with ${integrations.join(', ')} and other ecosystem modules to provide a unified experience.`;
  }

  /**
   * Extract module use cases
   */
  extractModuleUseCases(module, language) {
    const baseUseCases = module.useCases.length > 0 ? module.useCases : [
      language === 'en' ? 'Individual user applications' : 'Aplicaciones de usuario individual',
      language === 'en' ? 'Enterprise integrations' : 'Integraciones empresariales',
      language === 'en' ? 'Developer tools and APIs' : 'Herramientas y APIs para desarrolladores'
    ];
    
    return baseUseCases.slice(0, 3); // Top 3 use cases
  }

  /**
   * Extract module benefits
   */
  extractModuleBenefits(module, language) {
    const benefits = {
      'squid': language === 'en' ? 'complete identity control' : 'control completo de identidad',
      'qwallet': language === 'en' ? 'secure payments' : 'pagos seguros',
      'qchat': language === 'en' ? 'private messaging' : 'mensajería privada',
      'qdrive': language === 'en' ? 'decentralized storage' : 'almacenamiento descentralizado'
    };
    
    return benefits[module.name] || (language === 'en' ? 'enhanced capabilities' : 'capacidades mejoradas');
  }

  // Translation Methods

  /**
   * Translate description to target language
   */
  translateDescription(description, language) {
    if (language !== 'es') return description;
    
    const translations = {
      'Payments & Fees Module for AnarQ&Q Ecosystem': 'Módulo de Pagos y Tarifas para el Ecosistema AnarQ&Q',
      'Instant Messaging Module for AnarQ&Q Ecosystem': 'Módulo de Mensajería Instantánea para el Ecosistema AnarQ&Q',
      'Decentralized file storage with IPFS integration and encryption': 'Almacenamiento de archivos descentralizado con integración IPFS y encriptación',
      'Certified Messaging Module for AnarQ&Q Ecosystem': 'Módulo de Mensajería Certificada para el Ecosistema AnarQ&Q',
      'Content Marketplace Module for AnarQ&Q Ecosystem': 'Módulo de Mercado de Contenido para el Ecosistema AnarQ&Q',
      'Decentralized Autonomous Organization governance module for the Q ecosystem': 'Módulo de gobernanza de Organización Autónoma Descentralizada para el ecosistema Q'
    };
    
    return translations[description] || description;
  }

  /**
   * Translate feature to target language
   */
  translateFeature(feature, language) {
    if (language !== 'es') return feature;
    
    const translations = {
      'REST API access': 'Acceso a API REST',
      'MCP tools integration': 'Integración de herramientas MCP',
      'Standalone operation': 'Operación independiente',
      'Ecosystem integration': 'Integración del ecosistema',
      'Comprehensive testing': 'Pruebas integrales'
    };
    
    return translations[feature] || feature;
  }

  /**
   * Translate category to target language
   */
  translateCategory(category) {
    const translations = {
      'Core Identity & Security': 'Identidad Central y Seguridad',
      'Storage & Content': 'Almacenamiento y Contenido',
      'Communication & Commerce': 'Comunicación y Comercio',
      'Infrastructure & Governance': 'Infraestructura y Gobernanza'
    };
    
    return translations[category] || category;
  }

  /**
   * Format script as markdown
   */
  formatScriptAsMarkdown(script) {
    let markdown = `---
title: "${script.title}"
duration: "${script.duration}"
language: ${script.language}
targetAudience: ${script.targetAudience}
${script.module ? `module: ${script.module}` : ''}
version: ${script.metadata.version}
author: ${script.metadata.author}
reviewStatus: ${script.metadata.reviewStatus}
generated: ${new Date().toISOString()}
---

# ${script.title}

**Duration**: ${script.duration}  
**Language**: ${script.language.toUpperCase()}  
**Target Audience**: ${script.targetAudience}  
${script.module ? `**Module**: ${script.module}  ` : ''}

## Script Sections

`;

    // Add sections
    for (const section of script.sections) {
      markdown += `### ${section.title}
**Duration**: ${section.duration}

${section.content}

**Visual Suggestions**:
${section.visualSuggestions.map(v => `- ${v}`).join('\n')}

**Key Points**:
${section.keyPoints.map(p => `- ${p}`).join('\n')}

---

`;
    }

    // Add visual cues
    markdown += `## Visual Cues Timeline

| Timestamp | Type | Description | Source |
|-----------|------|-------------|---------|
`;

    for (const cue of script.visualCues) {
      markdown += `| ${cue.timestamp} | ${cue.type} | ${cue.description} | ${cue.source} |\n`;
    }

    // Add production notes
    markdown += `
## Production Notes

### Assets Required
${script.metadata.assets.map(asset => `- ${asset}`).join('\n')}

### Shot List
${script.metadata.shotList.map((shot, index) => `${index + 1}. ${shot}`).join('\n')}

### Technical Requirements
- **Video Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Audio**: 48kHz, 16-bit stereo
- **Format**: MP4 (H.264)

### Review Process
1. Content review by module team
2. Technical review by documentation team
3. Language review by localization team
4. Final approval by project lead

---
*Generated automatically by ScriptGenerator*  
*Last updated: ${new Date().toISOString()}*
`;

    return markdown;
  }
}

// CLI interface
async function main() {
  const generator = new ScriptGenerator();
  await generator.init();

  const command = process.argv[2];
  const param1 = process.argv[3];
  const param2 = process.argv[4];

  switch (command) {
    case 'global':
      const language = param1 || 'en';
      const script = await generator.generateGlobalScript(language);
      if (script) {
        console.log('Generated global script:', script.title);
      }
      break;
    
    case 'module':
      if (!param1) {
        console.error('Please provide a module name');
        process.exit(1);
      }
      const moduleScript = await generator.generateModuleScript(param1, param2 || 'en');
      if (moduleScript) {
        console.log('Generated module script:', moduleScript.title);
      }
      break;
    
    case 'all':
      await generator.generateAllScripts();
      await generator.saveAllScripts();
      break;
    
    case 'save':
      await generator.saveAllScripts();
      break;
    
    default:
      console.log(`
Usage: node ScriptGenerator.mjs <command> [options]

Commands:
  global [language]           - Generate global ecosystem script (en/es)
  module <name> [language]    - Generate module script (en/es)
  all                        - Generate all scripts in both languages
  save                       - Save all generated scripts to files

Examples:
  node ScriptGenerator.mjs global en
  node ScriptGenerator.mjs module qwallet es
  node ScriptGenerator.mjs all
`);
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script generation failed:', error);
    process.exit(1);
  });
}

export default ScriptGenerator;