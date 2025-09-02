#!/usr/bin/env node

/**
 * Content Extraction Engine
 * Parses documentation and extracts key points for video script generation
 * Supports advanced content analysis and key point identification
 */

import fs from 'fs/promises';
import path from 'path';

export class ContentExtractionEngine {
  constructor() {
    this.extractedContent = new Map();
    this.keyPhrases = new Map();
    this.contentSummaries = new Map();
  }

  /**
   * Extract key points from documentation content
   */
  async extractKeyPoints(content, type = 'general') {
    const keyPoints = [];
    
    // Extract headings as potential key points
    const headings = this.extractHeadings(content);
    keyPoints.push(...headings.filter(h => h.level <= 3).map(h => h.text));
    
    // Extract bullet points
    const bulletPoints = this.extractBulletPoints(content);
    keyPoints.push(...bulletPoints);
    
    // Extract emphasized text (bold/italic)
    const emphasizedText = this.extractEmphasizedText(content);
    keyPoints.push(...emphasizedText);
    
    // Extract sentences with key indicators
    const keyIndicators = [
      'provides', 'enables', 'supports', 'offers', 'includes',
      'proporciona', 'permite', 'soporta', 'ofrece', 'incluye'
    ];
    
    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 150) {
        for (const indicator of keyIndicators) {
          if (trimmed.toLowerCase().includes(indicator)) {
            keyPoints.push(trimmed);
            break;
          }
        }
      }
    }
    
    // Remove duplicates and filter by relevance
    const uniquePoints = [...new Set(keyPoints)];
    return this.filterRelevantPoints(uniquePoints, type);
  }

  /**
   * Extract benefits from content
   */
  extractBenefits(content, language = 'en') {
    const benefits = [];
    
    // Look for benefit patterns
    const benefitPatterns = language === 'en' ? [
      /benefits?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /advantages?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /why\s+[\w\s]+\?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ] : [
      /beneficios?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /ventajas?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /por\s+qué\s+[\w\s]+\?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ];
    
    for (const pattern of benefitPatterns) {
      const match = content.match(pattern);
      if (match) {
        const benefitText = match[1];
        const bulletPoints = this.extractBulletPoints(benefitText);
        benefits.push(...bulletPoints);
      }
    }
    
    // Fallback: extract from key features
    if (benefits.length === 0) {
      const features = this.extractFeatures(content);
      benefits.push(...features.slice(0, 4)); // Top 4 features as benefits
    }
    
    return benefits;
  }

  /**
   * Extract features from content
   */
  extractFeatures(content) {
    const features = [];
    
    // Look for features section
    const featuresMatch = content.match(/(?:key\s+)?features?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i);
    if (featuresMatch) {
      const featuresText = featuresMatch[1];
      const bulletPoints = this.extractBulletPoints(featuresText);
      features.push(...bulletPoints);
    }
    
    // Look for capabilities
    const capabilitiesMatch = content.match(/capabilities?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i);
    if (capabilitiesMatch) {
      const capabilitiesText = capabilitiesMatch[1];
      const bulletPoints = this.extractBulletPoints(capabilitiesText);
      features.push(...bulletPoints);
    }
    
    return features;
  }

  /**
   * Extract use cases from content
   */
  extractUseCases(content) {
    const useCases = [];
    
    // Look for use cases section
    const useCasesMatch = content.match(/use\s+cases?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i);
    if (useCasesMatch) {
      const useCasesText = useCasesMatch[1];
      const bulletPoints = this.extractBulletPoints(useCasesText);
      useCases.push(...bulletPoints);
    }
    
    // Look for examples section
    const examplesMatch = content.match(/examples?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i);
    if (examplesMatch) {
      const examplesText = examplesMatch[1];
      const bulletPoints = this.extractBulletPoints(examplesText);
      useCases.push(...bulletPoints);
    }
    
    return useCases;
  }

  /**
   * Extract technical specifications
   */
  extractTechnicalSpecs(content) {
    const specs = {
      endpoints: 0,
      mcpTools: 0,
      technologies: [],
      protocols: []
    };
    
    // Extract endpoint count
    const endpointMatch = content.match(/(\d+)\s+(?:HTTP\s+)?endpoints?/i);
    if (endpointMatch) {
      specs.endpoints = parseInt(endpointMatch[1]);
    }
    
    // Extract MCP tool count
    const mcpMatch = content.match(/(\d+)\s+MCP\s+tools?/i);
    if (mcpMatch) {
      specs.mcpTools = parseInt(mcpMatch[1]);
    }
    
    // Extract technologies
    const techPatterns = [
      /REST\s+API/i, /GraphQL/i, /WebSocket/i, /IPFS/i, /blockchain/i,
      /Docker/i, /Kubernetes/i, /Node\.js/i, /TypeScript/i, /JavaScript/i
    ];
    
    for (const pattern of techPatterns) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        if (match) {
          specs.technologies.push(match[0]);
        }
      }
    }
    
    return specs;
  }

  /**
   * Generate content summary
   */
  generateSummary(content, maxLength = 200) {
    // Extract first meaningful paragraph
    const paragraphs = content.split('\n\n').filter(p => {
      const trimmed = p.trim();
      return trimmed.length > 50 && 
             !trimmed.startsWith('#') && 
             !trimmed.startsWith('```') &&
             !trimmed.startsWith('-') &&
             !trimmed.startsWith('*');
    });
    
    if (paragraphs.length > 0) {
      let summary = paragraphs[0].trim();
      
      // Remove markdown formatting
      summary = summary.replace(/\*\*(.*?)\*\*/g, '$1');
      summary = summary.replace(/\*(.*?)\*/g, '$1');
      summary = summary.replace(/`(.*?)`/g, '$1');
      summary = summary.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      
      // Truncate if too long
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength).trim();
        const lastSpace = summary.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
          summary = summary.substring(0, lastSpace);
        }
        summary += '...';
      }
      
      return summary;
    }
    
    return 'Documentation summary not available.';
  }

  /**
   * Extract integration points
   */
  extractIntegrations(content) {
    const integrations = [];
    const moduleNames = [
      'squid', 'qindex', 'qerberos', 'qonsent', 'qlock', 'qdrive', 
      'qmail', 'qchat', 'qmarket', 'qwallet', 'qmask', 'qpic', 'qnet', 'dao'
    ];
    
    // Look for integration section
    const integrationMatch = content.match(/integrations?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i);
    if (integrationMatch) {
      const integrationText = integrationMatch[1];
      for (const moduleName of moduleNames) {
        const regex = new RegExp(`\\b${moduleName}\\b`, 'gi');
        if (regex.test(integrationText)) {
          integrations.push(moduleName);
        }
      }
    }
    
    // Look for module mentions throughout content
    for (const moduleName of moduleNames) {
      const regex = new RegExp(`\\b${moduleName}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length >= 2) { // Mentioned multiple times
        if (!integrations.includes(moduleName)) {
          integrations.push(moduleName);
        }
      }
    }
    
    return integrations;
  }

  /**
   * Extract problem statements
   */
  extractProblems(content, language = 'en') {
    const problems = [];
    
    const problemPatterns = language === 'en' ? [
      /problems?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /challenges?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /issues?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ] : [
      /problemas?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /desafíos?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /cuestiones?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ];
    
    for (const pattern of problemPatterns) {
      const match = content.match(pattern);
      if (match) {
        const problemText = match[1];
        const bulletPoints = this.extractBulletPoints(problemText);
        problems.push(...bulletPoints);
      }
    }
    
    return problems;
  }

  /**
   * Extract solution statements
   */
  extractSolutions(content, language = 'en') {
    const solutions = [];
    
    const solutionPatterns = language === 'en' ? [
      /solutions?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /approach:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /how\s+it\s+works:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ] : [
      /soluciones?:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /enfoque:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i,
      /cómo\s+funciona:?\s*\n([\s\S]*?)(?=\n##|\n\n\n|$)/i
    ];
    
    for (const pattern of solutionPatterns) {
      const match = content.match(pattern);
      if (match) {
        const solutionText = match[1];
        const bulletPoints = this.extractBulletPoints(solutionText);
        solutions.push(...bulletPoints);
      }
    }
    
    return solutions;
  }

  // Helper Methods

  /**
   * Extract headings from content
   */
  extractHeadings(content) {
    const headings = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const text = trimmed.replace(/^#+\s*/, '').trim();
        if (text) {
          headings.push({ level, text });
        }
      }
    }
    
    return headings;
  }

  /**
   * Extract bullet points from content
   */
  extractBulletPoints(content) {
    const bulletPoints = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('+')) {
        let text = trimmed.replace(/^[-*+]\s*/, '').trim();
        
        // Remove markdown formatting
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/\*(.*?)\*/g, '$1');
        text = text.replace(/`(.*?)`/g, '$1');
        
        if (text && text.length > 5) {
          bulletPoints.push(text);
        }
      }
    }
    
    return bulletPoints;
  }

  /**
   * Extract emphasized text (bold/italic)
   */
  extractEmphasizedText(content) {
    const emphasized = [];
    
    // Extract bold text
    const boldMatches = content.match(/\*\*(.*?)\*\*/g) || [];
    for (const match of boldMatches) {
      const text = match.replace(/\*\*/g, '').trim();
      if (text && text.length > 3 && text.length < 100) {
        emphasized.push(text);
      }
    }
    
    // Extract italic text
    const italicMatches = content.match(/\*(.*?)\*/g) || [];
    for (const match of italicMatches) {
      const text = match.replace(/\*/g, '').trim();
      if (text && text.length > 3 && text.length < 100 && !emphasized.includes(text)) {
        emphasized.push(text);
      }
    }
    
    return emphasized;
  }

  /**
   * Filter relevant points based on type and context
   */
  filterRelevantPoints(points, type) {
    const filtered = [];
    const irrelevantPatterns = [
      /^(table of contents|overview|introduction)$/i,
      /^(índice|visión general|introducción)$/i,
      /^(see|ver|check|consultar)/i,
      /^(http|https|www)/i,
      /^\d+$/,
      /^[a-z]$/i
    ];
    
    for (const point of points) {
      const trimmed = point.trim();
      
      // Skip if too short or too long
      if (trimmed.length < 5 || trimmed.length > 200) continue;
      
      // Skip irrelevant patterns
      let isIrrelevant = false;
      for (const pattern of irrelevantPatterns) {
        if (pattern.test(trimmed)) {
          isIrrelevant = true;
          break;
        }
      }
      
      if (!isIrrelevant) {
        filtered.push(trimmed);
      }
    }
    
    // Return top points based on type
    const maxPoints = type === 'global' ? 10 : 6;
    return filtered.slice(0, maxPoints);
  }

  /**
   * Analyze content sentiment and tone
   */
  analyzeTone(content) {
    const positiveWords = [
      'innovative', 'powerful', 'secure', 'efficient', 'reliable',
      'innovador', 'poderoso', 'seguro', 'eficiente', 'confiable'
    ];
    
    const technicalWords = [
      'API', 'protocol', 'architecture', 'implementation', 'integration',
      'protocolo', 'arquitectura', 'implementación', 'integración'
    ];
    
    const contentLower = content.toLowerCase();
    
    let positiveScore = 0;
    let technicalScore = 0;
    
    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) positiveScore += matches.length;
    }
    
    for (const word of technicalWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) technicalScore += matches.length;
    }
    
    return {
      positive: positiveScore,
      technical: technicalScore,
      tone: positiveScore > technicalScore ? 'marketing' : 'technical'
    };
  }

  /**
   * Extract call-to-action phrases
   */
  extractCallToActions(content, language = 'en') {
    const ctas = [];
    
    const ctaPatterns = language === 'en' ? [
      /get started/gi,
      /try now/gi,
      /learn more/gi,
      /contact us/gi,
      /join/gi,
      /explore/gi
    ] : [
      /comenzar/gi,
      /probar ahora/gi,
      /aprender más/gi,
      /contáctanos/gi,
      /únete/gi,
      /explorar/gi
    ];
    
    for (const pattern of ctaPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        ctas.push(...matches);
      }
    }
    
    return [...new Set(ctas)]; // Remove duplicates
  }
}

export default ContentExtractionEngine;