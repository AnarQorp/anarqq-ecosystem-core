/**
 * Unit Tests for ContentExtractionEngine
 * Tests content extraction, key point identification, and analysis functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentExtractionEngine } from '../../../scripts/ContentExtractionEngine.mjs';

describe('ContentExtractionEngine', () => {
  let engine;
  
  beforeEach(() => {
    engine = new ContentExtractionEngine();
  });

  describe('Initialization', () => {
    it('should initialize with empty maps', () => {
      expect(engine.extractedContent).toBeInstanceOf(Map);
      expect(engine.keyPhrases).toBeInstanceOf(Map);
      expect(engine.contentSummaries).toBeInstanceOf(Map);
      expect(engine.extractedContent.size).toBe(0);
    });
  });

  describe('Key Points Extraction', () => {
    it('should extract key points from headings', async () => {
      const content = `# Main Title

## Key Feature One
Description of feature one.

## Key Feature Two
Description of feature two.

### Sub-feature
Details about sub-feature.`;

      const keyPoints = await engine.extractKeyPoints(content, 'module');

      expect(keyPoints).toContain('Key Feature One');
      expect(keyPoints).toContain('Key Feature Two');
      expect(keyPoints).toContain('Sub-feature');
    });

    it('should extract key points from bullet points', async () => {
      const content = `# Module Features

The module provides:

- Secure authentication
- Real-time synchronization
- Cross-platform compatibility
- Advanced encryption
- User-friendly interface`;

      const keyPoints = await engine.extractKeyPoints(content, 'module');

      expect(keyPoints).toContain('Secure authentication');
      expect(keyPoints).toContain('Real-time synchronization');
      expect(keyPoints).toContain('Cross-platform compatibility');
    });

    it('should extract emphasized text', async () => {
      const content = `The module **provides secure storage** and *enables fast transactions*.

**Key benefits** include reliability and *seamless integration*.`;

      const keyPoints = await engine.extractKeyPoints(content, 'module');

      expect(keyPoints).toContain('provides secure storage');
      expect(keyPoints).toContain('enables fast transactions');
      expect(keyPoints).toContain('Key benefits');
      expect(keyPoints).toContain('seamless integration');
    });

    it('should extract sentences with key indicators', async () => {
      const content = `The system provides comprehensive security features.
      
This module enables real-time data synchronization across devices.

The platform supports multiple authentication methods.

It offers advanced encryption capabilities.`;

      const keyPoints = await engine.extractKeyPoints(content, 'module');

      expect(keyPoints.some(point => point.includes('provides comprehensive security'))).toBe(true);
      expect(keyPoints.some(point => point.includes('enables real-time data'))).toBe(true);
      expect(keyPoints.some(point => point.includes('supports multiple authentication'))).toBe(true);
      expect(keyPoints.some(point => point.includes('offers advanced encryption'))).toBe(true);
    });

    it('should filter irrelevant points', async () => {
      const content = `# Title

## Overview

- Good feature
- a
- 123
- http://example.com
- This is a very long sentence that exceeds the maximum length limit and should be filtered out because it contains too much information to be considered a concise key point for video script generation.`;

      const keyPoints = await engine.extractKeyPoints(content, 'module');

      expect(keyPoints).toContain('Good feature');
      expect(keyPoints).not.toContain('a');
      expect(keyPoints).not.toContain('123');
      expect(keyPoints).not.toContain('http://example.com');
      expect(keyPoints.every(point => point.length <= 200)).toBe(true);
    });
  });

  describe('Benefits Extraction', () => {
    it('should extract benefits from dedicated section', () => {
      const content = `# Module Documentation

## Benefits

- Complete control over your data
- Military-grade security
- Seamless integration
- Cost-effective solution

## Other Section

Some other content.`;

      const benefits = engine.extractBenefits(content, 'en');

      expect(benefits).toContain('Complete control over your data');
      expect(benefits).toContain('Military-grade security');
      expect(benefits).toContain('Seamless integration');
      expect(benefits).toContain('Cost-effective solution');
    });

    it('should extract benefits in Spanish', () => {
      const content = `# Documentación del Módulo

## Beneficios

- Control completo sobre tus datos
- Seguridad de grado militar
- Integración perfecta
- Solución rentable`;

      const benefits = engine.extractBenefits(content, 'es');

      expect(benefits).toContain('Control completo sobre tus datos');
      expect(benefits).toContain('Seguridad de grado militar');
    });

    it('should fallback to features when no benefits section exists', () => {
      const content = `# Module Documentation

## Key Features

- Feature one
- Feature two
- Feature three
- Feature four
- Feature five`;

      const benefits = engine.extractBenefits(content, 'en');

      expect(benefits).toHaveLength(4); // Top 4 features as benefits
      expect(benefits).toContain('Feature one');
      expect(benefits).toContain('Feature four');
    });
  });

  describe('Features Extraction', () => {
    it('should extract features from features section', () => {
      const content = `# Module

## Key Features

- Advanced encryption
- Real-time sync
- Multi-platform support
- User-friendly interface

## Capabilities

- High performance
- Scalable architecture`;

      const features = engine.extractFeatures(content);

      expect(features).toContain('Advanced encryption');
      expect(features).toContain('Real-time sync');
      expect(features).toContain('High performance');
      expect(features).toContain('Scalable architecture');
    });

    it('should handle missing features section', () => {
      const content = `# Module

## Overview

General information about the module.`;

      const features = engine.extractFeatures(content);

      expect(features).toEqual([]);
    });
  });

  describe('Use Cases Extraction', () => {
    it('should extract use cases from dedicated section', () => {
      const content = `# Module

## Use Cases

- Personal data management
- Enterprise security
- Developer integration
- IoT device management

## Examples

- E-commerce platforms
- Healthcare systems`;

      const useCases = engine.extractUseCases(content);

      expect(useCases).toContain('Personal data management');
      expect(useCases).toContain('Enterprise security');
      expect(useCases).toContain('E-commerce platforms');
      expect(useCases).toContain('Healthcare systems');
    });
  });

  describe('Technical Specifications Extraction', () => {
    it('should extract endpoint count', () => {
      const content = `The API provides 15 HTTP endpoints for comprehensive functionality.`;

      const specs = engine.extractTechnicalSpecs(content);

      expect(specs.endpoints).toBe(15);
    });

    it('should extract MCP tool count', () => {
      const content = `This module includes 8 MCP tools for enhanced functionality.`;

      const specs = engine.extractTechnicalSpecs(content);

      expect(specs.mcpTools).toBe(8);
    });

    it('should extract technologies', () => {
      const content = `Built with Node.js and TypeScript, using REST API and WebSocket connections.
      Supports Docker deployment and Kubernetes orchestration.`;

      const specs = engine.extractTechnicalSpecs(content);

      expect(specs.technologies).toContain('Node.js');
      expect(specs.technologies).toContain('TypeScript');
      expect(specs.technologies).toContain('REST API');
      expect(specs.technologies).toContain('WebSocket');
      expect(specs.technologies).toContain('Docker');
      expect(specs.technologies).toContain('Kubernetes');
    });
  });

  describe('Content Summary Generation', () => {
    it('should generate summary from first meaningful paragraph', () => {
      const content = `# Title

## Section

This is the first meaningful paragraph that describes the module functionality and its core purpose in the ecosystem.

## Another Section

More detailed content here.`;

      const summary = engine.generateSummary(content, 200);

      expect(summary).toBe('This is the first meaningful paragraph that describes the module functionality and its core purpose in the ecosystem.');
    });

    it('should truncate long summaries', () => {
      const content = `# Title

This is a very long paragraph that contains a lot of information about the module and its functionality, including detailed descriptions of features, benefits, use cases, and technical specifications that exceed the maximum length limit.`;

      const summary = engine.generateSummary(content, 100);

      expect(summary.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(summary).toEndWith('...');
    });

    it('should handle content without meaningful paragraphs', () => {
      const content = `# Title

## Section

- List item
- Another item

\`\`\`code
Some code
\`\`\``;

      const summary = engine.generateSummary(content, 200);

      expect(summary).toBe('Documentation summary not available.');
    });

    it('should remove markdown formatting from summary', () => {
      const content = `# Title

This paragraph contains **bold text**, *italic text*, \`code\`, and [links](url).`;

      const summary = engine.generateSummary(content, 200);

      expect(summary).toBe('This paragraph contains bold text, italic text, code, and links.');
    });
  });

  describe('Integration Points Extraction', () => {
    it('should extract integrations from dedicated section', () => {
      const content = `# Module

## Integrations

This module works with qindex for discovery, qerberos for security, and qwallet for payments.

## Other Section

Additional mentions of qonsent and qlock in context.`;

      const integrations = engine.extractIntegrations(content);

      expect(integrations).toContain('qindex');
      expect(integrations).toContain('qerberos');
      expect(integrations).toContain('qwallet');
    });

    it('should detect modules mentioned multiple times', () => {
      const content = `# Module

The qindex service is used for discovery. Later, qindex provides additional functionality.
Qerberos handles security throughout the system.`;

      const integrations = engine.extractIntegrations(content);

      expect(integrations).toContain('qindex'); // Mentioned multiple times
      expect(integrations).not.toContain('qerberos'); // Mentioned only once
    });
  });

  describe('Problem Statements Extraction', () => {
    it('should extract problems in English', () => {
      const content = `# Module

## Problems

- Data privacy concerns
- Centralized control issues
- Security vulnerabilities

## Challenges

- Scalability limitations
- Integration complexity`;

      const problems = engine.extractProblems(content, 'en');

      expect(problems).toContain('Data privacy concerns');
      expect(problems).toContain('Centralized control issues');
      expect(problems).toContain('Scalability limitations');
    });

    it('should extract problems in Spanish', () => {
      const content = `# Módulo

## Problemas

- Preocupaciones de privacidad
- Problemas de control centralizado

## Desafíos

- Limitaciones de escalabilidad`;

      const problems = engine.extractProblems(content, 'es');

      expect(problems).toContain('Preocupaciones de privacidad');
      expect(problems).toContain('Problemas de control centralizado');
      expect(problems).toContain('Limitaciones de escalabilidad');
    });
  });

  describe('Solution Statements Extraction', () => {
    it('should extract solutions in English', () => {
      const content = `# Module

## Solutions

- Decentralized architecture
- End-to-end encryption
- User-controlled data

## How it Works

- Distributed consensus
- Cryptographic verification`;

      const solutions = engine.extractSolutions(content, 'en');

      expect(solutions).toContain('Decentralized architecture');
      expect(solutions).toContain('End-to-end encryption');
      expect(solutions).toContain('Distributed consensus');
    });
  });

  describe('Helper Methods', () => {
    it('should extract headings with levels', () => {
      const content = `# Level 1

## Level 2

### Level 3

#### Level 4`;

      const headings = engine.extractHeadings(content);

      expect(headings).toHaveLength(4);
      expect(headings[0]).toEqual({ level: 1, text: 'Level 1' });
      expect(headings[1]).toEqual({ level: 2, text: 'Level 2' });
      expect(headings[2]).toEqual({ level: 3, text: 'Level 3' });
      expect(headings[3]).toEqual({ level: 4, text: 'Level 4' });
    });

    it('should extract bullet points', () => {
      const content = `- First item
* Second item
+ Third item
  - Nested item`;

      const bulletPoints = engine.extractBulletPoints(content);

      expect(bulletPoints).toContain('First item');
      expect(bulletPoints).toContain('Second item');
      expect(bulletPoints).toContain('Third item');
      expect(bulletPoints).toContain('Nested item');
    });

    it('should extract emphasized text', () => {
      const content = `This has **bold text** and *italic text*.
      
Also **another bold** and *another italic*.`;

      const emphasized = engine.extractEmphasizedText(content);

      expect(emphasized).toContain('bold text');
      expect(emphasized).toContain('italic text');
      expect(emphasized).toContain('another bold');
      expect(emphasized).toContain('another italic');
    });

    it('should filter relevant points', () => {
      const points = [
        'Good point',
        'table of contents',
        'overview',
        'http://example.com',
        'a',
        '123',
        'Another good point',
        'This is a very long point that exceeds the maximum length and should be filtered out because it contains too much information'
      ];

      const filtered = engine.filterRelevantPoints(points, 'module');

      expect(filtered).toContain('Good point');
      expect(filtered).toContain('Another good point');
      expect(filtered).not.toContain('table of contents');
      expect(filtered).not.toContain('overview');
      expect(filtered).not.toContain('http://example.com');
      expect(filtered).not.toContain('a');
      expect(filtered).not.toContain('123');
    });
  });

  describe('Content Analysis', () => {
    it('should analyze tone and sentiment', () => {
      const content = `This innovative and powerful solution provides secure and efficient functionality.
      
The API protocol uses advanced architecture for reliable implementation.`;

      const analysis = engine.analyzeTone(content);

      expect(analysis.positive).toBeGreaterThan(0);
      expect(analysis.technical).toBeGreaterThan(0);
      expect(analysis.tone).toBeDefined();
    });

    it('should extract call-to-action phrases in English', () => {
      const content = `Get started with our platform today. Try now for free.
      
Learn more about our features. Contact us for support.`;

      const ctas = engine.extractCallToActions(content, 'en');

      expect(ctas).toContain('Get started');
      expect(ctas).toContain('Try now');
      expect(ctas).toContain('Learn more');
      expect(ctas).toContain('Contact us');
    });

    it('should extract call-to-action phrases in Spanish', () => {
      const content = `Comenzar con nuestra plataforma. Probar ahora gratis.
      
Aprender más sobre características. Contáctanos para soporte.`;

      const ctas = engine.extractCallToActions(content, 'es');

      expect(ctas).toContain('Comenzar');
      expect(ctas).toContain('Probar ahora');
      expect(ctas).toContain('Aprender más');
      expect(ctas).toContain('Contáctanos');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const keyPoints = await engine.extractKeyPoints('', 'module');
      expect(keyPoints).toEqual([]);
    });

    it('should handle content with only whitespace', async () => {
      const keyPoints = await engine.extractKeyPoints('   \n\n   ', 'module');
      expect(keyPoints).toEqual([]);
    });

    it('should handle content with only markdown formatting', async () => {
      const content = `# 

## 

### 

- 
* 
+ `;

      const keyPoints = await engine.extractKeyPoints(content, 'module');
      expect(keyPoints).toEqual([]);
    });

    it('should handle malformed markdown', () => {
      const content = `# Incomplete heading
      
## Another incomplete
      
- Incomplete list item
* Another incomplete`;

      const headings = engine.extractHeadings(content);
      const bulletPoints = engine.extractBulletPoints(content);

      expect(headings).toHaveLength(2);
      expect(bulletPoints).toHaveLength(2);
    });
  });
});