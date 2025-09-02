/**
 * Search Service
 * Handles message search operations
 */

export class SearchService {
  constructor(dependencies) {
    this.qindex = dependencies.qindex;
    this.encryption = dependencies.encryption;
    this.qonsent = dependencies.qonsent;
  }

  /**
   * Search messages
   */
  async searchMessages(searchParams) {
    const startTime = Date.now();
    
    try {
      console.log(`[SearchService] Searching messages for ${searchParams.squidId} with query: "${searchParams.query}"`);

      // Check permissions
      const canSearch = await this.qonsent.checkPermission(
        searchParams.squidId,
        'message.read',
        'search'
      );
      
      if (!canSearch) {
        throw new Error('Permission denied to search messages');
      }

      // Use Qindex to search for messages
      const indexResults = await this.qindex.searchMessages({
        userId: searchParams.squidId,
        query: searchParams.query,
        folder: searchParams.folder,
        dateRange: searchParams.dateRange,
        limit: searchParams.limit
      });

      // Process search results
      const results = indexResults.results.map(result => ({
        messageId: result.messageId,
        subject: result.subject,
        snippet: this.generateSnippet(result.content, searchParams.query),
        senderId: result.senderId,
        timestamp: result.timestamp,
        relevanceScore: result.relevanceScore || 0.5
      }));

      const searchTime = Date.now() - startTime;

      console.log(`[SearchService] Search completed in ${searchTime}ms, found ${results.length} results`);

      return {
        results,
        totalMatches: indexResults.totalMatches || results.length,
        searchTime
      };

    } catch (error) {
      console.error(`[SearchService] Search failed for ${searchParams.squidId}:`, error);
      throw error;
    }
  }

  /**
   * Generate content snippet for search results
   */
  generateSnippet(content, query, maxLength = 150) {
    if (!content || !query) {
      return content ? content.substring(0, maxLength) + '...' : '';
    }

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryIndex = lowerContent.indexOf(lowerQuery);

    if (queryIndex === -1) {
      return content.substring(0, maxLength) + '...';
    }

    // Extract snippet around the query match
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 50);
    
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(squidId, partialQuery) {
    try {
      console.log(`[SearchService] Getting search suggestions for ${squidId}`);

      // In a real implementation, this would use search history and common terms
      const suggestions = [
        'subject:important',
        'from:alice',
        'attachment:pdf',
        'date:last-week',
        'priority:high'
      ].filter(suggestion => 
        suggestion.toLowerCase().includes(partialQuery.toLowerCase())
      );

      return {
        suggestions,
        query: partialQuery
      };

    } catch (error) {
      console.error(`[SearchService] Failed to get suggestions:`, error);
      throw error;
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(squidId, limit = 10) {
    try {
      console.log(`[SearchService] Getting search history for ${squidId}`);

      // In a real implementation, this would retrieve actual search history
      const mockHistory = [
        { query: 'quarterly report', timestamp: new Date(Date.now() - 86400000).toISOString(), resultCount: 5 },
        { query: 'meeting notes', timestamp: new Date(Date.now() - 172800000).toISOString(), resultCount: 12 },
        { query: 'project update', timestamp: new Date(Date.now() - 259200000).toISOString(), resultCount: 8 }
      ];

      return {
        history: mockHistory.slice(0, limit),
        totalCount: mockHistory.length
      };

    } catch (error) {
      console.error(`[SearchService] Failed to get search history:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}