import type { 
  QsocialPost, 
  QsocialComment, 
  Subcommunity, 
  User,
  UserReputation
} from '../../types/qsocial';
// Import types only to avoid circular dependencies during testing
import type { PostService } from './PostService';
import type { CommentService } from './CommentService';
import type { SubcommunityService } from './SubcommunityService';

/**
 * Search filters for content discovery
 */
export interface SearchFilters {
  contentType?: 'posts' | 'comments' | 'subcommunities' | 'users' | 'all';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  subcommunityId?: string;
  authorId?: string;
  tags?: string[];
  minQarma?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'qarma';
  limit?: number;
  offset?: number;
}

/**
 * Search result with relevance scoring
 */
export interface SearchResultItem {
  id: string;
  type: 'post' | 'comment' | 'subcommunity' | 'user';
  relevanceScore: number;
  data: QsocialPost | QsocialComment | Subcommunity | User;
  highlights?: string[];
}

/**
 * Comprehensive search results
 */
export interface SearchResults {
  query: string;
  totalResults: number;
  results: SearchResultItem[];
  facets: {
    contentTypes: Record<string, number>;
    subcommunities: Record<string, number>;
    authors: Record<string, number>;
    tags: Record<string, number>;
  };
  suggestions?: string[];
}

/**
 * Search index entry for efficient searching
 */
interface SearchIndexEntry {
  id: string;
  type: 'post' | 'comment' | 'subcommunity' | 'user';
  title?: string;
  content: string;
  authorId?: string;
  subcommunityId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  qarmaScore: number;
  popularity: number;
  keywords: string[];
}

/**
 * Service for full-text search and content discovery
 */
export class SearchService {
  private static searchIndex: Map<string, SearchIndexEntry> = new Map();
  private static lastIndexUpdate: Date = new Date(0);
  private static readonly INDEX_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Perform full-text search across all content
   */
  static async search(query: string, filters: SearchFilters = {}): Promise<SearchResults> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Sanitize and prepare query
    const sanitizedQuery = this.sanitizeQuery(query);
    const searchTerms = this.extractSearchTerms(sanitizedQuery);

    // Ensure search index is up to date
    await this.updateSearchIndex();

    // Perform search
    const results = this.performSearch(searchTerms, filters);

    // Calculate facets
    const facets = this.calculateFacets(results);

    // Generate suggestions
    const suggestions = this.generateSuggestions(sanitizedQuery, results);

    return {
      query: sanitizedQuery,
      totalResults: results.length,
      results: results.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50)),
      facets,
      suggestions
    };
  }

  /**
   * Search specifically for posts
   */
  static async searchPosts(query: string, filters: Omit<SearchFilters, 'contentType'> = {}): Promise<QsocialPost[]> {
    const results = await this.search(query, { ...filters, contentType: 'posts' });
    return results.results.map(r => r.data as QsocialPost);
  }

  /**
   * Search specifically for comments
   */
  static async searchComments(query: string, filters: Omit<SearchFilters, 'contentType'> = {}): Promise<QsocialComment[]> {
    const results = await this.search(query, { ...filters, contentType: 'comments' });
    return results.results.map(r => r.data as QsocialComment);
  }

  /**
   * Search specifically for subcommunities
   */
  static async searchSubcommunities(query: string, filters: Omit<SearchFilters, 'contentType'> = {}): Promise<Subcommunity[]> {
    const results = await this.search(query, { ...filters, contentType: 'subcommunities' });
    return results.results.map(r => r.data as Subcommunity);
  }

  /**
   * Get trending content based on recent activity and engagement
   */
  static async getTrendingContent(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day', limit: number = 20): Promise<SearchResultItem[]> {
    await this.updateSearchIndex();

    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffDate = new Date(now.getTime() - timeRangeMs);

    const trendingItems: SearchResultItem[] = [];

    for (const [id, entry] of this.searchIndex) {
      if (entry.createdAt >= cutoffDate) {
        // Calculate trending score based on recency and engagement
        const ageHours = (now.getTime() - entry.createdAt.getTime()) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 1 - (ageHours / (timeRangeMs / (1000 * 60 * 60))));
        const engagementScore = Math.log(entry.popularity + 1) / 10;
        const qarmaScore = Math.max(0, entry.qarmaScore) / 100;
        
        const trendingScore = (recencyScore * 0.4) + (engagementScore * 0.4) + (qarmaScore * 0.2);

        if (trendingScore > 0.1) { // Minimum threshold for trending
          const data = await this.getItemData(entry);
          if (data) {
            trendingItems.push({
              id: entry.id,
              type: entry.type,
              relevanceScore: trendingScore,
              data,
              highlights: []
            });
          }
        }
      }
    }

    // Sort by trending score and return top results
    return trendingItems
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Get content recommendations for a user based on their activity and interests
   * This method now delegates to the RecommendationService for more sophisticated recommendations
   */
  static async getRecommendations(userId: string, limit: number = 20): Promise<SearchResultItem[]> {
    // Import RecommendationService dynamically to avoid circular dependencies
    const { RecommendationService } = await import('./RecommendationService');
    
    try {
      // Get personalized recommendations from the dedicated service
      const recommendations = await RecommendationService.getPersonalizedRecommendations(userId, limit);
      
      // Convert RecommendationResult to SearchResultItem for backward compatibility
      return recommendations.map(rec => ({
        id: rec.id,
        type: rec.type,
        relevanceScore: rec.relevanceScore,
        data: rec.data,
        highlights: rec.highlights
      }));
    } catch (error) {
      console.error('Failed to get recommendations from RecommendationService, falling back to basic recommendations:', error);
      
      // Fallback to basic recommendations
      return this.getBasicRecommendations(userId, limit);
    }
  }

  /**
   * Fallback method for basic recommendations when RecommendationService fails
   */
  private static async getBasicRecommendations(userId: string, limit: number = 20): Promise<SearchResultItem[]> {
    await this.updateSearchIndex();

    // Get user's activity patterns (this would typically come from a user activity service)
    const userInterests = await this.getUserInterests(userId);
    const userSubcommunities = await this.getUserSubcommunities(userId);

    const recommendations: SearchResultItem[] = [];

    for (const [id, entry] of this.searchIndex) {
      // Skip user's own content
      if (entry.authorId === userId) continue;

      let relevanceScore = 0;

      // Score based on subcommunity membership
      if (entry.subcommunityId && userSubcommunities.includes(entry.subcommunityId)) {
        relevanceScore += 0.3;
      }

      // Score based on tag interests
      const commonTags = entry.tags.filter(tag => userInterests.tags.includes(tag));
      relevanceScore += (commonTags.length / Math.max(entry.tags.length, 1)) * 0.3;

      // Score based on content quality (qarma)
      relevanceScore += Math.min(entry.qarmaScore / 100, 0.2);

      // Score based on recency
      const ageHours = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - (ageHours / (24 * 7))); // Decay over a week
      relevanceScore += recencyScore * 0.2;

      if (relevanceScore > 0.2) { // Minimum threshold for recommendations
        const data = await this.getItemData(entry);
        if (data) {
          recommendations.push({
            id: entry.id,
            type: entry.type,
            relevanceScore,
            data,
            highlights: []
          });
        }
      }
    }

    // Sort by relevance score and return top results
    return recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Update the search index with latest content
   */
  private static async updateSearchIndex(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastIndexUpdate.getTime() < this.INDEX_REFRESH_INTERVAL) {
      return; // Index is still fresh
    }

    try {
      // Index posts
      await this.indexPosts();
      
      // Index comments
      await this.indexComments();
      
      // Index subcommunities
      await this.indexSubcommunities();

      this.lastIndexUpdate = now;
    } catch (error) {
      console.error('Failed to update search index:', error);
      // Continue with stale index rather than failing
    }
  }

  /**
   * Index all posts for search
   */
  private static async indexPosts(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { PostService } = await import('./PostService');
      
      // Get recent posts (in a real implementation, this would be paginated)
      const posts = await PostService.getFeed({ limit: 1000, sortBy: 'newest' });
      
      for (const post of posts) {
        const keywords = this.extractKeywords(post.title + ' ' + post.content);
        const popularity = post.upvotes + post.commentCount - post.downvotes;
        
        this.searchIndex.set(`post:${post.id}`, {
          id: post.id,
          type: 'post',
          title: post.title,
          content: post.content,
          authorId: post.authorId,
          subcommunityId: post.subcommunityId,
          tags: post.tags,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          qarmaScore: post.upvotes - post.downvotes,
          popularity,
          keywords
        });
      }
    } catch (error) {
      console.error('Failed to index posts:', error);
    }
  }

  /**
   * Index all comments for search
   */
  private static async indexComments(): Promise<void> {
    try {
      // Dynamic imports to avoid circular dependencies
      const { PostService } = await import('./PostService');
      const { CommentService } = await import('./CommentService');
      
      // In a real implementation, this would fetch comments more efficiently
      // For now, we'll simulate with a limited set
      const recentPosts = await PostService.getFeed({ limit: 100, sortBy: 'newest' });
      
      for (const post of recentPosts) {
        try {
          const comments = await CommentService.getPostComments(post.id, { limit: 100 });
          
          for (const comment of comments) {
            const keywords = this.extractKeywords(comment.content);
            const popularity = comment.upvotes - comment.downvotes;
            
            this.searchIndex.set(`comment:${comment.id}`, {
              id: comment.id,
              type: 'comment',
              content: comment.content,
              authorId: comment.authorId,
              subcommunityId: post.subcommunityId, // Inherit from post
              tags: [], // Comments don't have tags
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              qarmaScore: comment.upvotes - comment.downvotes,
              popularity,
              keywords
            });
          }
        } catch (error) {
          console.error(`Failed to index comments for post ${post.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to index comments:', error);
    }
  }

  /**
   * Index all subcommunities for search
   */
  private static async indexSubcommunities(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { SubcommunityService } = await import('./SubcommunityService');
      
      // Get trending subcommunities as a proxy for all subcommunities
      const subcommunities = await SubcommunityService.getTrendingSubcommunities();
      
      for (const subcommunity of subcommunities) {
        const keywords = this.extractKeywords(
          subcommunity.displayName + ' ' + 
          subcommunity.description + ' ' + 
          subcommunity.rules.join(' ')
        );
        
        this.searchIndex.set(`subcommunity:${subcommunity.id}`, {
          id: subcommunity.id,
          type: 'subcommunity',
          title: subcommunity.displayName,
          content: subcommunity.description,
          authorId: subcommunity.creatorId,
          tags: [], // Subcommunities don't have tags in the current model
          createdAt: subcommunity.createdAt,
          updatedAt: subcommunity.createdAt, // No updatedAt in current model
          qarmaScore: subcommunity.memberCount * 10, // Use member count as proxy for quality
          popularity: subcommunity.postCount + subcommunity.memberCount,
          keywords
        });
      }
    } catch (error) {
      console.error('Failed to index subcommunities:', error);
    }
  }

  /**
   * Perform the actual search against the index
   */
  private static performSearch(searchTerms: string[], filters: SearchFilters): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    for (const [key, entry] of this.searchIndex) {
      // Apply content type filter
      if (filters.contentType && filters.contentType !== 'all' && !this.matchesContentType(entry.type, filters.contentType)) {
        continue;
      }

      // Apply date range filter
      if (filters.dateRange) {
        if (filters.dateRange.from && entry.createdAt < filters.dateRange.from) continue;
        if (filters.dateRange.to && entry.createdAt > filters.dateRange.to) continue;
      }

      // Apply subcommunity filter
      if (filters.subcommunityId && entry.subcommunityId !== filters.subcommunityId) {
        continue;
      }

      // Apply author filter
      if (filters.authorId && entry.authorId !== filters.authorId) {
        continue;
      }

      // Apply tag filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => entry.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }

      // Apply minimum qarma filter
      if (filters.minQarma && entry.qarmaScore < filters.minQarma) {
        continue;
      }

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(entry, searchTerms);
      
      if (relevanceScore > 0) {
        // Get highlights
        const highlights = this.generateHighlights(entry, searchTerms);
        
        results.push({
          id: entry.id,
          type: entry.type,
          relevanceScore,
          data: null as any, // Will be populated later
          highlights
        });
      }
    }

    // Sort results
    this.sortResults(results, filters.sortBy || 'relevance');

    // Populate data for results
    return this.populateResultData(results);
  }

  /**
   * Calculate relevance score for a search result
   */
  private static calculateRelevanceScore(entry: SearchIndexEntry, searchTerms: string[]): number {
    let score = 0;

    const allText = (entry.title || '') + ' ' + entry.content + ' ' + entry.keywords.join(' ');
    const lowerText = allText.toLowerCase();

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();
      
      // Exact phrase match in title (highest weight)
      if (entry.title && entry.title.toLowerCase().includes(lowerTerm)) {
        score += 10;
      }
      
      // Exact phrase match in content
      if (lowerText.includes(lowerTerm)) {
        score += 5;
      }
      
      // Keyword match
      if (entry.keywords.some(keyword => keyword.toLowerCase().includes(lowerTerm))) {
        score += 3;
      }
      
      // Tag match
      if (entry.tags.some(tag => tag.toLowerCase().includes(lowerTerm))) {
        score += 7;
      }
      
      // Fuzzy matching for typos (simple implementation)
      const fuzzyMatches = this.findFuzzyMatches(lowerTerm, lowerText);
      score += fuzzyMatches * 1;
    }

    // Boost score based on content quality
    score += Math.min(entry.qarmaScore / 10, 5);
    
    // Boost score based on popularity
    score += Math.min(entry.popularity / 20, 3);
    
    // Boost recent content slightly
    const ageHours = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 1 - (ageHours / (24 * 30))); // Decay over a month
    score += recencyBoost * 2;

    return score;
  }

  /**
   * Generate highlighted snippets for search results
   */
  private static generateHighlights(entry: SearchIndexEntry, searchTerms: string[]): string[] {
    const highlights: string[] = [];
    const content = entry.content;
    const maxHighlightLength = 150;

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();
      const lowerContent = content.toLowerCase();
      const index = lowerContent.indexOf(lowerTerm);
      
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + term.length + 50);
        let snippet = content.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        // Highlight the search term
        const regex = new RegExp(`(${term})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
        
        highlights.push(snippet);
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights per result
  }

  /**
   * Sort search results based on the specified criteria
   */
  private static sortResults(results: SearchResultItem[], sortBy: string): void {
    switch (sortBy) {
      case 'date':
        results.sort((a, b) => {
          const aEntry = this.searchIndex.get(`${a.type}:${a.id}`);
          const bEntry = this.searchIndex.get(`${b.type}:${b.id}`);
          return (bEntry?.createdAt.getTime() || 0) - (aEntry?.createdAt.getTime() || 0);
        });
        break;
      case 'popularity':
        results.sort((a, b) => {
          const aEntry = this.searchIndex.get(`${a.type}:${a.id}`);
          const bEntry = this.searchIndex.get(`${b.type}:${b.id}`);
          return (bEntry?.popularity || 0) - (aEntry?.popularity || 0);
        });
        break;
      case 'qarma':
        results.sort((a, b) => {
          const aEntry = this.searchIndex.get(`${a.type}:${a.id}`);
          const bEntry = this.searchIndex.get(`${b.type}:${b.id}`);
          return (bEntry?.qarmaScore || 0) - (aEntry?.qarmaScore || 0);
        });
        break;
      case 'relevance':
      default:
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
    }
  }

  /**
   * Populate actual data objects for search results
   */
  private static populateResultData(results: SearchResultItem[]): SearchResultItem[] {
    return results.map(result => ({
      ...result,
      data: this.getItemDataSync(result.id, result.type)
    })).filter(result => result.data !== null);
  }

  /**
   * Get item data synchronously from the search index
   */
  private static getItemDataSync(id: string, type: string): any {
    const entry = this.searchIndex.get(`${type}:${id}`);
    if (!entry) return null;

    // Create a mock data object based on the index entry
    // In a real implementation, this would fetch from the actual services
    switch (type) {
      case 'post':
        return {
          id: entry.id,
          title: entry.title,
          content: entry.content,
          authorId: entry.authorId,
          subcommunityId: entry.subcommunityId,
          tags: entry.tags,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          upvotes: Math.max(0, entry.qarmaScore),
          downvotes: Math.max(0, -entry.qarmaScore),
          commentCount: Math.floor(entry.popularity / 2)
        };
      case 'comment':
        return {
          id: entry.id,
          content: entry.content,
          authorId: entry.authorId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          upvotes: Math.max(0, entry.qarmaScore),
          downvotes: Math.max(0, -entry.qarmaScore)
        };
      case 'subcommunity':
        return {
          id: entry.id,
          displayName: entry.title,
          description: entry.content,
          creatorId: entry.authorId,
          createdAt: entry.createdAt,
          memberCount: Math.floor(entry.qarmaScore / 10),
          postCount: Math.floor(entry.popularity / 2)
        };
      default:
        return null;
    }
  }

  /**
   * Get actual item data asynchronously
   */
  private static async getItemData(entry: SearchIndexEntry): Promise<any> {
    try {
      switch (entry.type) {
        case 'post':
          const { PostService } = await import('./PostService');
          return await PostService.getPost(entry.id);
        case 'comment':
          const { CommentService } = await import('./CommentService');
          return await CommentService.getComment(entry.id);
        case 'subcommunity':
          const { SubcommunityService } = await import('./SubcommunityService');
          return await SubcommunityService.getSubcommunity(entry.id);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to get ${entry.type} data for ${entry.id}:`, error);
      return null;
    }
  }

  /**
   * Calculate facets for search results
   */
  private static calculateFacets(results: SearchResultItem[]): SearchResults['facets'] {
    const facets = {
      contentTypes: {} as Record<string, number>,
      subcommunities: {} as Record<string, number>,
      authors: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };

    for (const result of results) {
      const entry = this.searchIndex.get(`${result.type}:${result.id}`);
      if (!entry) continue;

      // Content type facet
      facets.contentTypes[entry.type] = (facets.contentTypes[entry.type] || 0) + 1;

      // Subcommunity facet
      if (entry.subcommunityId) {
        facets.subcommunities[entry.subcommunityId] = (facets.subcommunities[entry.subcommunityId] || 0) + 1;
      }

      // Author facet
      if (entry.authorId) {
        facets.authors[entry.authorId] = (facets.authors[entry.authorId] || 0) + 1;
      }

      // Tags facet
      for (const tag of entry.tags) {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      }
    }

    return facets;
  }

  /**
   * Generate search suggestions based on query and results
   */
  private static generateSuggestions(query: string, results: SearchResultItem[]): string[] {
    const suggestions: string[] = [];
    
    // Extract common terms from successful results
    const commonTerms = new Map<string, number>();
    
    for (const result of results.slice(0, 10)) { // Only look at top 10 results
      const entry = this.searchIndex.get(`${result.type}:${result.id}`);
      if (!entry) continue;
      
      for (const keyword of entry.keywords) {
        if (keyword.length > 2 && !query.toLowerCase().includes(keyword.toLowerCase())) {
          commonTerms.set(keyword, (commonTerms.get(keyword) || 0) + 1);
        }
      }
      
      for (const tag of entry.tags) {
        if (!query.toLowerCase().includes(tag.toLowerCase())) {
          commonTerms.set(tag, (commonTerms.get(tag) || 0) + 2); // Tags are more valuable
        }
      }
    }
    
    // Sort by frequency and take top suggestions
    const sortedTerms = Array.from(commonTerms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);
    
    suggestions.push(...sortedTerms);
    
    return suggestions;
  }

  /**
   * Helper methods
   */
  private static sanitizeQuery(query: string): string {
    return query.trim().substring(0, 200); // Limit query length
  }

  private static extractSearchTerms(query: string): string[] {
    // Split by spaces and remove empty terms
    return query.split(/\s+/).filter(term => term.length > 0);
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction - split by spaces and punctuation
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove duplicates and common stop words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    return Array.from(new Set(words.filter(word => !stopWords.has(word))));
  }

  private static matchesContentType(entryType: string, filterType: string): boolean {
    switch (filterType) {
      case 'posts':
        return entryType === 'post';
      case 'comments':
        return entryType === 'comment';
      case 'subcommunities':
        return entryType === 'subcommunity';
      case 'users':
        return entryType === 'user';
      default:
        return true;
    }
  }

  private static findFuzzyMatches(term: string, text: string): number {
    // Simple fuzzy matching - count partial matches
    let matches = 0;
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (word.includes(term) || term.includes(word)) {
        matches++;
      }
    }
    
    return matches;
  }

  private static getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private static async getUserInterests(userId: string): Promise<{ tags: string[]; subcommunities: string[] }> {
    // Mock implementation - in reality, this would analyze user's activity
    return {
      tags: ['technology', 'programming', 'web3', 'blockchain'],
      subcommunities: []
    };
  }

  private static async getUserSubcommunities(userId: string): Promise<string[]> {
    // Mock implementation - in reality, this would fetch user's joined subcommunities
    return [];
  }
}