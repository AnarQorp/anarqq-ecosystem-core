/**
 * Mock Qindex Service
 * Simulates Qindex message indexing functionality
 */

export class MockQindexService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
    this.messageIndex = new Map();
    this.searchIndex = new Map();
  }

  async initialize() {
    console.log(`[MockQindex] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  /**
   * Index a message
   */
  async indexMessage(messageData) {
    try {
      console.log(`[MockQindex] Indexing message ${messageData.messageId}`);

      const indexEntry = {
        messageId: messageData.messageId,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        subject: messageData.subject,
        timestamp: messageData.timestamp,
        ipfsCid: messageData.ipfsCid,
        tags: messageData.tags || [],
        indexed: true,
        indexedAt: new Date().toISOString()
      };

      // Store in message index
      this.messageIndex.set(messageData.messageId, indexEntry);

      // Add to search index (simplified)
      const searchTerms = this.extractSearchTerms(messageData.subject);
      searchTerms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, []);
        }
        this.searchIndex.get(term).push(messageData.messageId);
      });

      console.log(`[MockQindex] Message ${messageData.messageId} indexed successfully`);
      return true;

    } catch (error) {
      console.error(`[MockQindex] Failed to index message:`, error);
      throw error;
    }
  }

  /**
   * Remove message from index
   */
  async removeMessage(messageId) {
    try {
      console.log(`[MockQindex] Removing message ${messageId} from index`);

      const indexEntry = this.messageIndex.get(messageId);
      if (indexEntry) {
        // Remove from message index
        this.messageIndex.delete(messageId);

        // Remove from search index
        const searchTerms = this.extractSearchTerms(indexEntry.subject);
        searchTerms.forEach(term => {
          const termMessages = this.searchIndex.get(term);
          if (termMessages) {
            const index = termMessages.indexOf(messageId);
            if (index > -1) {
              termMessages.splice(index, 1);
            }
            if (termMessages.length === 0) {
              this.searchIndex.delete(term);
            }
          }
        });
      }

      console.log(`[MockQindex] Message ${messageId} removed from index`);
      return true;

    } catch (error) {
      console.error(`[MockQindex] Failed to remove message from index:`, error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(searchParams) {
    try {
      console.log(`[MockQindex] Searching messages for user ${searchParams.userId} with query: "${searchParams.query}"`);

      const allMessages = Array.from(this.messageIndex.values());
      
      // Filter by user (sender or recipient)
      let userMessages = allMessages.filter(msg => 
        msg.senderId === searchParams.userId || 
        msg.recipientId === searchParams.userId
      );

      // Apply folder filter
      if (searchParams.folder && searchParams.folder !== 'ALL') {
        if (searchParams.folder === 'INBOX') {
          userMessages = userMessages.filter(msg => msg.recipientId === searchParams.userId);
        } else if (searchParams.folder === 'SENT') {
          userMessages = userMessages.filter(msg => msg.senderId === searchParams.userId);
        }
      }

      // Apply date range filter
      if (searchParams.dateRange) {
        const startDate = searchParams.dateRange.from ? new Date(searchParams.dateRange.from) : null;
        const endDate = searchParams.dateRange.to ? new Date(searchParams.dateRange.to) : null;
        
        userMessages = userMessages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          return (!startDate || msgDate >= startDate) && (!endDate || msgDate <= endDate);
        });
      }

      // Apply text search
      if (searchParams.query) {
        const queryLower = searchParams.query.toLowerCase();
        userMessages = userMessages.filter(msg => 
          msg.subject.toLowerCase().includes(queryLower) ||
          msg.senderId.toLowerCase().includes(queryLower) ||
          msg.recipientId.toLowerCase().includes(queryLower)
        );
      }

      // Sort by relevance (timestamp for now)
      userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply limit
      const limit = searchParams.limit || 10;
      const results = userMessages.slice(0, limit).map(msg => ({
        messageId: msg.messageId,
        subject: msg.subject,
        senderId: msg.senderId,
        timestamp: msg.timestamp,
        relevanceScore: this.calculateRelevanceScore(msg, searchParams.query),
        content: `[SEARCH_RESULT_CONTENT_FOR_${msg.messageId}]` // Mock content
      }));

      console.log(`[MockQindex] Search found ${results.length} results`);

      return {
        results,
        totalMatches: userMessages.length
      };

    } catch (error) {
      console.error(`[MockQindex] Search failed:`, error);
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId) {
    try {
      console.log(`[MockQindex] Getting message ${messageId} from index`);

      const indexEntry = this.messageIndex.get(messageId);
      if (!indexEntry) {
        throw new Error('Message not found in index');
      }

      return indexEntry;

    } catch (error) {
      console.error(`[MockQindex] Failed to get message from index:`, error);
      throw error;
    }
  }

  /**
   * List messages for user
   */
  async listMessages(userId, options = {}) {
    try {
      console.log(`[MockQindex] Listing messages for user ${userId}`);

      const allMessages = Array.from(this.messageIndex.values());
      let userMessages = allMessages.filter(msg => 
        msg.senderId === userId || msg.recipientId === userId
      );

      // Apply filters
      if (options.folder === 'INBOX') {
        userMessages = userMessages.filter(msg => msg.recipientId === userId);
      } else if (options.folder === 'SENT') {
        userMessages = userMessages.filter(msg => msg.senderId === userId);
      }

      // Sort by timestamp
      userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      const paginatedMessages = userMessages.slice(offset, offset + limit);

      return {
        messages: paginatedMessages,
        totalCount: userMessages.length,
        hasMore: offset + limit < userMessages.length
      };

    } catch (error) {
      console.error(`[MockQindex] Failed to list messages:`, error);
      throw error;
    }
  }

  /**
   * Extract search terms from text
   */
  extractSearchTerms(text) {
    if (!text) return [];
    
    return text.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 10); // Limit to 10 terms
  }

  /**
   * Calculate relevance score
   */
  calculateRelevanceScore(message, query) {
    if (!query) return 0.5;
    
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Subject match
    if (message.subject.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }
    
    // Exact match bonus
    if (message.subject.toLowerCase() === queryLower) {
      score += 0.3;
    }
    
    // Recency bonus
    const daysSinceMessage = (Date.now() - new Date(message.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSinceMessage < 7) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone',
      indexedMessages: this.messageIndex.size,
      searchTerms: this.searchIndex.size
    };
  }

  async shutdown() {
    console.log('[MockQindex] Shutting down');
    this.messageIndex.clear();
    this.searchIndex.clear();
  }
}