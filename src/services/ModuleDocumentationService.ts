/**
 * Module Documentation Service
 * Handles IPFS integration for storing and retrieving module documentation
 * Provides documentation CID validation, availability checking, and versioning
 */

import ipfsService from '../../backend/services/ipfsService.mjs';
import { IPFS_CID_PATTERN } from '../types/qwallet-module-registration';

export interface DocumentationMetadata {
  title: string;
  version: string;
  moduleId: string;
  format: 'markdown' | 'html' | 'pdf' | 'json';
  language: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  size: number;
  checksum: string;
}

export interface DocumentationVersion {
  version: string;
  cid: string;
  metadata: DocumentationMetadata;
  createdAt: string;
  changelog?: string;
  deprecated?: boolean;
}

export interface DocumentationIndex {
  moduleId: string;
  currentVersion: string;
  versions: DocumentationVersion[];
  searchIndex: DocumentationSearchIndex;
  lastUpdated: string;
}

export interface DocumentationSearchIndex {
  keywords: string[];
  sections: Array<{
    title: string;
    content: string;
    level: number;
    anchor: string;
  }>;
  metadata: Record<string, any>;
}

export interface DocumentationUploadOptions {
  moduleId: string;
  version: string;
  format: 'markdown' | 'html' | 'pdf' | 'json';
  language?: string;
  author?: string;
  tags?: string[];
  generateSearchIndex?: boolean;
}

export interface DocumentationRetrievalOptions {
  version?: string;
  format?: 'raw' | 'parsed' | 'metadata-only';
  includeSearchIndex?: boolean;
}

export interface DocumentationValidationResult {
  valid: boolean;
  available: boolean;
  metadata?: DocumentationMetadata;
  errors: string[];
  warnings: string[];
}

export interface DocumentationSearchResult {
  moduleId: string;
  version: string;
  cid: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  matchedSections: Array<{
    title: string;
    content: string;
    anchor: string;
  }>;
}

export class ModuleDocumentationService {
  private documentationCache = new Map<string, any>();
  private indexCache = new Map<string, DocumentationIndex>();
  private validationCache = new Map<string, DocumentationValidationResult>();
  
  // Cache TTL in milliseconds (1 hour)
  private readonly CACHE_TTL = 60 * 60 * 1000;

  /**
   * Upload documentation to IPFS with metadata and indexing
   */
  async uploadDocumentation(
    content: string | Buffer,
    options: DocumentationUploadOptions
  ): Promise<{ cid: string; metadata: DocumentationMetadata }> {
    try {
      console.log(`[ModuleDocumentationService] Uploading documentation for module: ${options.moduleId}`);

      // Generate metadata
      const metadata: DocumentationMetadata = {
        title: this.extractTitle(content, options.format),
        version: options.version,
        moduleId: options.moduleId,
        format: options.format,
        language: options.language || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: options.author || 'unknown',
        tags: options.tags || [],
        size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'),
        checksum: this.generateChecksum(content)
      };

      // Create documentation package with metadata
      const documentationPackage = {
        content: Buffer.isBuffer(content) ? content.toString('base64') : content,
        metadata,
        searchIndex: options.generateSearchIndex ? this.generateSearchIndex(content, options.format) : undefined
      };

      // Upload to IPFS
      const uploadResult = await ipfsService.uploadToStoracha(
        JSON.stringify(documentationPackage),
        `${options.moduleId}-docs-${options.version}.json`,
        'default'
      );

      if (!uploadResult.success) {
        throw new Error(`Failed to upload documentation: ${uploadResult.error || 'Unknown error'}`);
      }

      console.log(`[ModuleDocumentationService] Documentation uploaded successfully. CID: ${uploadResult.cid}`);

      // Update documentation index
      await this.updateDocumentationIndex(options.moduleId, {
        version: options.version,
        cid: uploadResult.cid,
        metadata,
        createdAt: new Date().toISOString()
      });

      // Clear cache for this module
      this.clearModuleCache(options.moduleId);

      return {
        cid: uploadResult.cid,
        metadata
      };

    } catch (error) {
      console.error('[ModuleDocumentationService] Error uploading documentation:', error);
      throw new Error(`Failed to upload documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve documentation from IPFS
   */
  async retrieveDocumentation(
    cid: string,
    options: DocumentationRetrievalOptions = {}
  ): Promise<{
    content: string | Buffer;
    metadata: DocumentationMetadata;
    searchIndex?: DocumentationSearchIndex;
  }> {
    try {
      console.log(`[ModuleDocumentationService] Retrieving documentation CID: ${cid}`);

      // Check cache first
      const cacheKey = `${cid}-${JSON.stringify(options)}`;
      if (this.documentationCache.has(cacheKey)) {
        const cached = this.documentationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log(`[ModuleDocumentationService] Returning cached documentation for CID: ${cid}`);
          return cached.data;
        }
      }

      // Download from IPFS
      const downloadResult = await ipfsService.downloadFromStoracha(cid);
      const documentationPackage = JSON.parse(downloadResult.toString());

      if (!documentationPackage.metadata) {
        throw new Error('Invalid documentation package: missing metadata');
      }

      let content: string | Buffer = documentationPackage.content;

      // Handle different formats
      if (options.format === 'metadata-only') {
        content = '';
      } else if (options.format === 'parsed' && documentationPackage.metadata.format === 'markdown') {
        content = this.parseMarkdown(content as string);
      } else if (documentationPackage.metadata.format === 'pdf' || content.startsWith('data:')) {
        // Handle base64 encoded content
        content = Buffer.from(content as string, 'base64');
      }

      const result = {
        content,
        metadata: documentationPackage.metadata,
        searchIndex: options.includeSearchIndex ? documentationPackage.searchIndex : undefined
      };

      // Cache the result
      this.documentationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`[ModuleDocumentationService] Documentation retrieved successfully for CID: ${cid}`);
      return result;

    } catch (error) {
      console.error(`[ModuleDocumentationService] Error retrieving documentation ${cid}:`, error);
      throw new Error(`Failed to retrieve documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate documentation CID and check availability
   */
  async validateDocumentationCID(cid: string): Promise<DocumentationValidationResult> {
    try {
      console.log(`[ModuleDocumentationService] Validating documentation CID: ${cid}`);

      // Check cache first
      if (this.validationCache.has(cid)) {
        const cached = this.validationCache.get(cid)!;
        if (Date.now() - (cached as any).timestamp < this.CACHE_TTL) {
          return cached;
        }
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate CID format
      if (!IPFS_CID_PATTERN.test(cid)) {
        errors.push('Invalid IPFS CID format');
      }

      let available = false;
      let metadata: DocumentationMetadata | undefined;

      if (errors.length === 0) {
        try {
          // Check availability by attempting to retrieve metadata
          const result = await this.retrieveDocumentation(cid, { format: 'metadata-only' });
          available = true;
          metadata = result.metadata;

          // Validate metadata completeness
          if (!metadata.title) warnings.push('Documentation title is missing');
          if (!metadata.version) warnings.push('Documentation version is missing');
          if (!metadata.moduleId) warnings.push('Module ID is missing from documentation');
          if (metadata.size === 0) warnings.push('Documentation appears to be empty');

        } catch (error) {
          available = false;
          errors.push(`Documentation not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const result: DocumentationValidationResult = {
        valid: errors.length === 0,
        available,
        metadata,
        errors,
        warnings
      };

      // Cache the result
      this.validationCache.set(cid, {
        ...result,
        timestamp: Date.now()
      } as any);

      console.log(`[ModuleDocumentationService] Validation complete for CID: ${cid}. Valid: ${result.valid}, Available: ${result.available}`);
      return result;

    } catch (error) {
      console.error(`[ModuleDocumentationService] Error validating CID ${cid}:`, error);
      return {
        valid: false,
        available: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Search documentation across modules
   */
  async searchDocumentation(
    query: string,
    options: {
      moduleIds?: string[];
      version?: string;
      language?: string;
      tags?: string[];
      limit?: number;
    } = {}
  ): Promise<DocumentationSearchResult[]> {
    try {
      console.log(`[ModuleDocumentationService] Searching documentation for query: "${query}"`);

      const results: DocumentationSearchResult[] = [];
      const { moduleIds, version, language, tags, limit = 10 } = options;

      // Get all documentation indexes to search
      const indexesToSearch = moduleIds 
        ? moduleIds.map(id => this.indexCache.get(id)).filter(Boolean) as DocumentationIndex[]
        : Array.from(this.indexCache.values());

      for (const index of indexesToSearch) {
        if (!index) continue;

        // Filter versions based on criteria
        const versionsToSearch = index.versions.filter(v => {
          if (version && v.version !== version) return false;
          if (language && v.metadata.language !== language) return false;
          if (tags && !tags.some(tag => v.metadata.tags.includes(tag))) return false;
          if (v.deprecated) return false;
          return true;
        });

        for (const versionInfo of versionsToSearch) {
          const searchResult = this.searchInDocumentationVersion(query, index.moduleId, versionInfo);
          if (searchResult.relevanceScore > 0) {
            results.push(searchResult);
          }
        }
      }

      // Sort by relevance score and limit results
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const limitedResults = results.slice(0, limit);

      console.log(`[ModuleDocumentationService] Search completed. Found ${limitedResults.length} results`);
      return limitedResults;

    } catch (error) {
      console.error('[ModuleDocumentationService] Error searching documentation:', error);
      return [];
    }
  }

  /**
   * Get documentation versions for a module
   */
  async getDocumentationVersions(moduleId: string): Promise<DocumentationVersion[]> {
    try {
      const index = await this.getDocumentationIndex(moduleId);
      return index ? index.versions : [];
    } catch (error) {
      console.error(`[ModuleDocumentationService] Error getting versions for module ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Update documentation version (creates new version)
   */
  async updateDocumentation(
    moduleId: string,
    newVersion: string,
    content: string | Buffer,
    options: Omit<DocumentationUploadOptions, 'moduleId' | 'version'>
  ): Promise<{ cid: string; metadata: DocumentationMetadata }> {
    try {
      console.log(`[ModuleDocumentationService] Updating documentation for module: ${moduleId} to version: ${newVersion}`);

      // Upload new version
      const uploadResult = await this.uploadDocumentation(content, {
        ...options,
        moduleId,
        version: newVersion
      });

      // Mark previous versions as non-current (but don't deprecate)
      const index = await this.getDocumentationIndex(moduleId);
      if (index) {
        index.currentVersion = newVersion;
        index.lastUpdated = new Date().toISOString();
        this.indexCache.set(moduleId, index);
      }

      console.log(`[ModuleDocumentationService] Documentation updated successfully for module: ${moduleId}`);
      return uploadResult;

    } catch (error) {
      console.error(`[ModuleDocumentationService] Error updating documentation for module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Deprecate a documentation version
   */
  async deprecateDocumentationVersion(moduleId: string, version: string): Promise<boolean> {
    try {
      const index = await this.getDocumentationIndex(moduleId);
      if (!index) return false;

      const versionInfo = index.versions.find(v => v.version === version);
      if (!versionInfo) return false;

      versionInfo.deprecated = true;
      index.lastUpdated = new Date().toISOString();
      
      this.indexCache.set(moduleId, index);
      this.clearModuleCache(moduleId);

      console.log(`[ModuleDocumentationService] Deprecated documentation version ${version} for module: ${moduleId}`);
      return true;

    } catch (error) {
      console.error(`[ModuleDocumentationService] Error deprecating version ${version} for module ${moduleId}:`, error);
      return false;
    }
  }

  /**
   * Get current documentation CID for a module
   */
  async getCurrentDocumentationCID(moduleId: string): Promise<string | null> {
    try {
      const index = await this.getDocumentationIndex(moduleId);
      if (!index) return null;

      const currentVersion = index.versions.find(v => v.version === index.currentVersion);
      return currentVersion ? currentVersion.cid : null;

    } catch (error) {
      console.error(`[ModuleDocumentationService] Error getting current CID for module ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Clear cache for a specific module
   */
  private clearModuleCache(moduleId: string): void {
    // Clear documentation cache entries for this module
    for (const [key] of this.documentationCache) {
      if (key.includes(moduleId)) {
        this.documentationCache.delete(key);
      }
    }

    // Clear validation cache entries that might be related
    // (We can't easily determine which CIDs belong to which modules from cache keys alone)
    // So we'll let them expire naturally
  }

  /**
   * Generate search index for documentation content
   */
  private generateSearchIndex(content: string | Buffer, format: string): DocumentationSearchIndex {
    const textContent = Buffer.isBuffer(content) ? content.toString() : content;
    
    // Extract keywords (simple implementation)
    const keywords = this.extractKeywords(textContent);
    
    // Extract sections (for markdown)
    const sections = format === 'markdown' ? this.extractMarkdownSections(textContent) : [];
    
    return {
      keywords,
      sections,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
        characterCount: textContent.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Extract title from content based on format
   */
  private extractTitle(content: string | Buffer, format: string): string {
    const textContent = Buffer.isBuffer(content) ? content.toString() : content;
    
    if (format === 'markdown') {
      const titleMatch = textContent.match(/^#\s+(.+)$/m);
      if (titleMatch) return titleMatch[1].trim();
    }
    
    if (format === 'html') {
      const titleMatch = textContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) return titleMatch[1].trim();
      
      const h1Match = textContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) return h1Match[1].trim();
    }
    
    // Fallback: use first line or default
    const firstLine = textContent.split('\n')[0]?.trim();
    return firstLine || 'Untitled Documentation';
  }

  /**
   * Generate checksum for content
   */
  private generateChecksum(content: string | Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract keywords from text content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - remove common words and get unique terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    // Get unique words and sort by frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Top 50 keywords
      .map(([word]) => word);
  }

  /**
   * Extract sections from markdown content
   */
  private extractMarkdownSections(content: string): Array<{
    title: string;
    content: string;
    level: number;
    anchor: string;
  }> {
    const sections: Array<{
      title: string;
      content: string;
      level: number;
      anchor: string;
    }> = [];
    
    const lines = content.split('\n');
    let currentSection: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const anchor = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        
        currentSection = {
          title,
          level,
          anchor,
          content: ''
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Parse markdown content to HTML (simple implementation)
   */
  private parseMarkdown(content: string): string {
    // Very basic markdown parsing - in a real implementation, use a proper markdown parser
    let html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```[\s\S]*?```/g, '<pre><code>$&</code></pre>');
    
    // Split into paragraphs and wrap
    const paragraphs = html.split(/\n\s*\n/);
    return paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => p.startsWith('<h') || p.startsWith('<pre') ? p : `<p>${p}</p>`)
      .join('\n');
  }

  /**
   * Search within a specific documentation version
   */
  private searchInDocumentationVersion(
    query: string,
    moduleId: string,
    versionInfo: DocumentationVersion
  ): DocumentationSearchResult {
    const queryLower = query.toLowerCase();
    let relevanceScore = 0;
    const matchedSections: Array<{
      title: string;
      content: string;
      anchor: string;
    }> = [];

    // Search in title
    if (versionInfo.metadata.title.toLowerCase().includes(queryLower)) {
      relevanceScore += 10;
    }

    // Search in tags
    const matchingTags = versionInfo.metadata.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower)
    );
    relevanceScore += matchingTags.length * 5;

    // Search in sections (if available in cache)
    const cacheKey = `${versionInfo.cid}-${JSON.stringify({ includeSearchIndex: true })}`;
    const cachedDoc = this.documentationCache.get(cacheKey);
    
    if (cachedDoc?.data?.searchIndex?.sections) {
      for (const section of cachedDoc.data.searchIndex.sections) {
        if (section.title.toLowerCase().includes(queryLower) || 
            section.content.toLowerCase().includes(queryLower)) {
          relevanceScore += 3;
          matchedSections.push({
            title: section.title,
            content: this.extractExcerpt(section.content, query),
            anchor: section.anchor
          });
        }
      }
    }

    // Generate excerpt from title and first matched section
    const excerpt = matchedSections.length > 0 
      ? matchedSections[0].content
      : versionInfo.metadata.title;

    return {
      moduleId,
      version: versionInfo.version,
      cid: versionInfo.cid,
      title: versionInfo.metadata.title,
      excerpt,
      relevanceScore,
      matchedSections: matchedSections.slice(0, 3) // Limit to top 3 matches
    };
  }

  /**
   * Extract excerpt around search query
   */
  private extractExcerpt(content: string, query: string, maxLength: number = 200): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 150);
    
    let excerpt = content.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  /**
   * Get or create documentation index for a module
   */
  private async getDocumentationIndex(moduleId: string): Promise<DocumentationIndex | null> {
    if (this.indexCache.has(moduleId)) {
      return this.indexCache.get(moduleId)!;
    }
    
    try {
      // Try to load from persistent storage (IPFS)
      const indexCid = await this.getStoredIndexCID(moduleId);
      if (indexCid) {
        const indexData = await ipfsService.downloadFromStoracha(indexCid);
        const index = JSON.parse(indexData.toString()) as DocumentationIndex;
        this.indexCache.set(moduleId, index);
        return index;
      }
    } catch (error) {
      console.warn(`[ModuleDocumentationService] Could not load stored index for ${moduleId}:`, error.message);
    }
    
    return null;
  }

  /**
   * Get stored index CID for a module (from a registry or known location)
   */
  private async getStoredIndexCID(moduleId: string): Promise<string | null> {
    // In a real implementation, this would query a registry service
    // For now, we'll use a simple naming convention and try to find it
    try {
      const indexFileName = `${moduleId}-docs-index.json`;
      // This is a placeholder - in reality, you'd have a registry of index CIDs
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store documentation index to persistent storage
   */
  private async storeDocumentationIndex(index: DocumentationIndex): Promise<string | null> {
    try {
      const indexData = JSON.stringify(index, null, 2);
      const indexFileName = `${index.moduleId}-docs-index.json`;
      
      const uploadResult = await ipfsService.uploadToStoracha(
        indexData,
        indexFileName,
        'default'
      );
      
      if (uploadResult.success) {
        console.log(`[ModuleDocumentationService] Stored documentation index for ${index.moduleId}. CID: ${uploadResult.cid}`);
        return uploadResult.cid;
      }
    } catch (error) {
      console.error(`[ModuleDocumentationService] Failed to store index for ${index.moduleId}:`, error);
    }
    
    return null;
  }

  /**
   * Update documentation index with new version
   */
  private async updateDocumentationIndex(
    moduleId: string,
    versionInfo: DocumentationVersion
  ): Promise<void> {
    let index = this.indexCache.get(moduleId);
    
    if (!index) {
      index = {
        moduleId,
        currentVersion: versionInfo.version,
        versions: [],
        searchIndex: {
          keywords: [],
          sections: [],
          metadata: {}
        },
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Add or update version
    const existingVersionIndex = index.versions.findIndex(v => v.version === versionInfo.version);
    if (existingVersionIndex >= 0) {
      index.versions[existingVersionIndex] = versionInfo;
    } else {
      index.versions.push(versionInfo);
    }
    
    // Update current version and timestamp
    index.currentVersion = versionInfo.version;
    index.lastUpdated = new Date().toISOString();
    
    // Store in cache
    this.indexCache.set(moduleId, index);
    
    // Store index persistently to IPFS
    try {
      await this.storeDocumentationIndex(index);
    } catch (error) {
      console.warn(`[ModuleDocumentationService] Failed to store index persistently for ${moduleId}:`, error.message);
      // Don't throw error - cache update succeeded, persistent storage is optional
    }
  }
}

// Export singleton instance
export const moduleDocumentationService = new ModuleDocumentationService();
export default moduleDocumentationService;