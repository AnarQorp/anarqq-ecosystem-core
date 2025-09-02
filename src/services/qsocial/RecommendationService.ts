import type { 
  QsocialPost, 
  QsocialComment, 
  Subcommunity, 
  User,
  UserReputation
} from '../../types/qsocial';
import { PostService } from './PostService';
import { CommentService } from './CommentService';
import { SubcommunityService } from './SubcommunityService';
import { VotingService } from './VotingService';
import type { SearchResultItem } from './SearchService';

/**
 * User interest profile for personalized recommendations
 */
export interface UserInterestProfile {
  userId: string;
  tags: Record<string, number>; // tag -> interest score
  subcommunities: Record<string, number>; // subcommunity -> activity score
  authors: Record<string, number>; // author -> interaction score
  contentTypes: Record<string, number>; // content type -> preference score
  timePreferences: {
    activeHours: number[]; // Hours of day when user is most active
    activeDays: number[]; // Days of week when user is most active
  };
  engagementPatterns: {
    averageReadTime: number;
    preferredContentLength: 'short' | 'medium' | 'long';
    interactionRate: number; // votes/comments per view
  };
  lastUpdated: Date;
}

/**
 * Trending content item with trend metrics
 */
export interface TrendingItem {
  id: string;
  type: 'post' | 'comment' | 'subcommunity';
  data: QsocialPost | QsocialComment | Subcommunity;
  trendScore: number;
  metrics: {
    velocityScore: number; // Rate of engagement increase
    momentumScore: number; // Sustained engagement over time
    qualityScore: number; // Based on qarma and user feedback
    diversityScore: number; // Engagement from diverse user base
  };
  timeframe: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Featured content with editorial curation
 */
export interface FeaturedContent {
  id: string;
  type: 'post' | 'subcommunity';
  data: QsocialPost | Subcommunity;
  featureReason: 'editorial' | 'community_choice' | 'algorithm' | 'milestone';
  featuredAt: Date;
  featuredBy?: string; // Moderator/admin who featured it
  expiresAt?: Date;
  priority: number; // Higher priority shows first
}

/**
 * Recommendation explanation for transparency
 */
export interface RecommendationExplanation {
  primaryReason: string;
  factors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  confidence: number; // 0-1 score
}

/**
 * Enhanced recommendation result
 */
export interface RecommendationResult extends SearchResultItem {
  explanation: RecommendationExplanation;
  category: 'trending' | 'personalized' | 'featured' | 'discovery' | 'social';
  freshness: number; // 0-1 score, 1 being very fresh
}

/**
 * Service for content recommendations and trending detection
 */
export class RecommendationService {
  private static userProfiles: Map<string, UserInterestProfile> = new Map();
  private static trendingCache: Map<string, TrendingItem[]> = new Map();
  private static featuredContent: FeaturedContent[] = [];
  private static lastTrendingUpdate: Date = new Date(0);
  private static readonly TRENDING_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Get personalized recommendations for a user
   */
  static async getPersonalizedRecommendations(
    userId: string, 
    limit: number = 20,
    excludeViewed: string[] = []
  ): Promise<RecommendationResult[]> {
    // Get or build user interest profile
    const userProfile = await this.getUserInterestProfile(userId);
    
    // Get candidate content
    const candidates = await this.getCandidateContent(userId, excludeViewed);
    
    // Score candidates based on user interests
    const scoredCandidates = this.scorePersonalizedCandidates(candidates, userProfile);
    
    // Apply diversity and freshness filters
    const diversifiedResults = this.applyDiversityFilters(scoredCandidates, userProfile);
    
    // Convert to recommendation results with explanations
    const recommendations = diversifiedResults.slice(0, limit).map(candidate => 
      this.createRecommendationResult(candidate, userProfile, 'personalized')
    );
    
    return recommendations;
  }

  /**
   * Get trending content with sophisticated trend detection
   */
  static async getTrendingContent(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 20,
    contentType?: 'posts' | 'comments' | 'subcommunities'
  ): Promise<TrendingItem[]> {
    const cacheKey = `${timeframe}_${contentType || 'all'}`;
    
    // Check cache first
    if (this.isTrendingCacheValid() && this.trendingCache.has(cacheKey)) {
      return this.trendingCache.get(cacheKey)!.slice(0, limit);
    }
    
    // Calculate trending content
    const trendingItems = await this.calculateTrendingContent(timeframe, contentType);
    
    // Cache results
    this.trendingCache.set(cacheKey, trendingItems);
    this.lastTrendingUpdate = new Date();
    
    return trendingItems.slice(0, limit);
  }

  /**
   * Get featured content curated by moderators and algorithms
   */
  static async getFeaturedContent(
    limit: number = 10,
    category?: 'editorial' | 'community_choice' | 'algorithm' | 'milestone'
  ): Promise<FeaturedContent[]> {
    // Filter by category if specified
    let featured = category 
      ? this.featuredContent.filter(item => item.featureReason === category)
      : this.featuredContent;
    
    // Filter out expired content
    const now = new Date();
    featured = featured.filter(item => !item.expiresAt || item.expiresAt > now);
    
    // Sort by priority and featured date
    featured.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.featuredAt.getTime() - a.featuredAt.getTime();
    });
    
    return featured.slice(0, limit);
  }

  /**
   * Get discovery recommendations for exploring new content
   */
  static async getDiscoveryRecommendations(
    userId: string,
    limit: number = 15
  ): Promise<RecommendationResult[]> {
    const userProfile = await this.getUserInterestProfile(userId);
    
    // Get content from subcommunities user hasn't joined
    const unexploredSubcommunities = await this.getUnexploredSubcommunities(userId);
    const discoveryContent: any[] = [];
    
    // Sample content from unexplored subcommunities
    for (const subcommunity of unexploredSubcommunities.slice(0, 5)) {
      try {
        const posts = await PostService.getSubcommunityFeed(subcommunity.id, { limit: 3, sortBy: 'popular' });
        discoveryContent.push(...posts.map(post => ({
          ...post,
          _discoverySource: 'subcommunity',
          _sourceSubcommunity: subcommunity
        })));
      } catch (error) {
        console.error(`Failed to get discovery content from subcommunity ${subcommunity.id}:`, error);
      }
    }
    
    // Get content from authors user hasn't interacted with
    const newAuthors = await this.getNewAuthorsContent(userId, 10);
    discoveryContent.push(...newAuthors);
    
    // Score discovery content
    const scoredContent = this.scoreDiscoveryContent(discoveryContent, userProfile);
    
    // Convert to recommendation results
    return scoredContent.slice(0, limit).map(content => 
      this.createRecommendationResult(content, userProfile, 'discovery')
    );
  }

  /**
   * Get social recommendations based on user's network
   */
  static async getSocialRecommendations(
    userId: string,
    limit: number = 15
  ): Promise<RecommendationResult[]> {
    // Get user's social connections (followers, following, frequent interactions)
    const socialConnections = await this.getUserSocialConnections(userId);
    
    // Get recent activity from social connections
    const socialActivity: any[] = [];
    
    for (const connectionId of socialConnections.slice(0, 10)) {
      try {
        const posts = await PostService.getUserPosts(connectionId, { limit: 3, sortBy: 'newest' });
        socialActivity.push(...posts.map(post => ({
          ...post,
          _socialSource: connectionId,
          _socialType: 'connection_post'
        })));
        
        // Also get posts they've voted on (if available)
        // This would require additional API endpoints in a real implementation
      } catch (error) {
        console.error(`Failed to get social content from user ${connectionId}:`, error);
      }
    }
    
    const userProfile = await this.getUserInterestProfile(userId);
    
    // Score social content
    const scoredContent = this.scoreSocialContent(socialActivity, userProfile, socialConnections);
    
    // Convert to recommendation results
    return scoredContent.slice(0, limit).map(content => 
      this.createRecommendationResult(content, userProfile, 'social')
    );
  }

  /**
   * Feature content (for moderators/admins)
   */
  static async featureContent(
    contentId: string,
    contentType: 'post' | 'subcommunity',
    reason: FeaturedContent['featureReason'],
    featuredBy: string,
    priority: number = 1,
    expiresAt?: Date
  ): Promise<void> {
    // Get the content data
    let data: QsocialPost | Subcommunity;
    
    try {
      if (contentType === 'post') {
        data = await PostService.getPost(contentId);
      } else {
        data = await SubcommunityService.getSubcommunity(contentId);
      }
    } catch (error) {
      throw new Error(`Failed to feature content: Content not found`);
    }
    
    // Remove existing feature for this content
    this.featuredContent = this.featuredContent.filter(item => item.id !== contentId);
    
    // Add new featured content
    this.featuredContent.push({
      id: contentId,
      type: contentType,
      data,
      featureReason: reason,
      featuredAt: new Date(),
      featuredBy,
      expiresAt,
      priority
    });
    
    // Sort by priority
    this.featuredContent.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove featured content
   */
  static async unfeatureContent(contentId: string): Promise<void> {
    this.featuredContent = this.featuredContent.filter(item => item.id !== contentId);
  }

  /**
   * Update user interest profile based on activity
   */
  static async updateUserInterestProfile(
    userId: string,
    activity: {
      type: 'view' | 'vote' | 'comment' | 'share';
      contentId: string;
      contentType: 'post' | 'comment';
      tags?: string[];
      subcommunityId?: string;
      authorId?: string;
      duration?: number; // For view activity
    }
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = await this.createUserInterestProfile(userId);
    }
    
    // Update interest scores based on activity
    const weight = this.getActivityWeight(activity.type);
    
    // Update tag interests
    if (activity.tags) {
      for (const tag of activity.tags) {
        profile.tags[tag] = (profile.tags[tag] || 0) + weight;
      }
    }
    
    // Update subcommunity interests
    if (activity.subcommunityId) {
      profile.subcommunities[activity.subcommunityId] = 
        (profile.subcommunities[activity.subcommunityId] || 0) + weight;
    }
    
    // Update author interests
    if (activity.authorId) {
      profile.authors[activity.authorId] = 
        (profile.authors[activity.authorId] || 0) + weight;
    }
    
    // Update content type preferences
    profile.contentTypes[activity.contentType] = 
      (profile.contentTypes[activity.contentType] || 0) + weight;
    
    // Update engagement patterns
    if (activity.type === 'view' && activity.duration) {
      profile.engagementPatterns.averageReadTime = 
        (profile.engagementPatterns.averageReadTime + activity.duration) / 2;
    }
    
    // Update time preferences
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    if (!profile.timePreferences.activeHours.includes(hour)) {
      profile.timePreferences.activeHours.push(hour);
    }
    if (!profile.timePreferences.activeDays.includes(day)) {
      profile.timePreferences.activeDays.push(day);
    }
    
    profile.lastUpdated = new Date();
    this.userProfiles.set(userId, profile);
  }

  /**
   * Private helper methods
   */
  
  private static async getUserInterestProfile(userId: string): Promise<UserInterestProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = await this.createUserInterestProfile(userId);
      this.userProfiles.set(userId, profile);
    }
    
    return profile;
  }

  private static async createUserInterestProfile(userId: string): Promise<UserInterestProfile> {
    // In a real implementation, this would analyze user's historical activity
    return {
      userId,
      tags: {},
      subcommunities: {},
      authors: {},
      contentTypes: { post: 1, comment: 0.5 },
      timePreferences: {
        activeHours: [],
        activeDays: []
      },
      engagementPatterns: {
        averageReadTime: 30, // seconds
        preferredContentLength: 'medium',
        interactionRate: 0.1
      },
      lastUpdated: new Date()
    };
  }

  private static async getCandidateContent(userId: string, excludeViewed: string[]): Promise<any[]> {
    const candidates: any[] = [];
    
    try {
      // Get recent posts
      const recentPosts = await PostService.getFeed({ limit: 100, sortBy: 'newest' });
      candidates.push(...recentPosts.filter(post => 
        post.authorId !== userId && !excludeViewed.includes(post.id)
      ));
      
      // Get popular posts
      const popularPosts = await PostService.getFeed({ limit: 50, sortBy: 'popular' });
      candidates.push(...popularPosts.filter(post => 
        post.authorId !== userId && !excludeViewed.includes(post.id)
      ));
      
    } catch (error) {
      console.error('Failed to get candidate content:', error);
    }
    
    // Remove duplicates
    const uniqueCandidates = candidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.id === candidate.id)
    );
    
    return uniqueCandidates;
  }

  private static scorePersonalizedCandidates(candidates: any[], userProfile: UserInterestProfile): any[] {
    return candidates.map(candidate => {
      let score = 0;
      
      // Tag interest score
      if (candidate.tags) {
        for (const tag of candidate.tags) {
          score += (userProfile.tags[tag] || 0) * 0.3;
        }
      }
      
      // Subcommunity interest score
      if (candidate.subcommunityId) {
        score += (userProfile.subcommunities[candidate.subcommunityId] || 0) * 0.25;
      }
      
      // Author interest score
      if (candidate.authorId) {
        score += (userProfile.authors[candidate.authorId] || 0) * 0.2;
      }
      
      // Content type preference
      const contentType = candidate.contentType || 'post';
      score += (userProfile.contentTypes[contentType] || 0) * 0.15;
      
      // Quality score (qarma)
      const qarmaScore = (candidate.upvotes || 0) - (candidate.downvotes || 0);
      score += Math.min(qarmaScore / 10, 0.1);
      
      return {
        ...candidate,
        _personalizedScore: score
      };
    }).sort((a, b) => b._personalizedScore - a._personalizedScore);
  }

  private static applyDiversityFilters(candidates: any[], userProfile: UserInterestProfile): any[] {
    const diversified: any[] = [];
    const seenAuthors = new Set<string>();
    const seenSubcommunities = new Set<string>();
    const seenTags = new Set<string>();
    
    for (const candidate of candidates) {
      let diversityScore = 1;
      
      // Penalize if we've seen too much from this author
      if (candidate.authorId && seenAuthors.has(candidate.authorId)) {
        diversityScore *= 0.7;
      }
      
      // Penalize if we've seen too much from this subcommunity
      if (candidate.subcommunityId && seenSubcommunities.has(candidate.subcommunityId)) {
        diversityScore *= 0.8;
      }
      
      // Reward new tags
      const newTags = candidate.tags?.filter((tag: string) => !seenTags.has(tag)) || [];
      diversityScore *= (1 + newTags.length * 0.1);
      
      candidate._diversityScore = diversityScore;
      candidate._finalScore = candidate._personalizedScore * diversityScore;
      
      diversified.push(candidate);
      
      // Track what we've seen
      if (candidate.authorId) seenAuthors.add(candidate.authorId);
      if (candidate.subcommunityId) seenSubcommunities.add(candidate.subcommunityId);
      if (candidate.tags) {
        candidate.tags.forEach((tag: string) => seenTags.add(tag));
      }
    }
    
    return diversified.sort((a, b) => b._finalScore - a._finalScore);
  }

  private static async calculateTrendingContent(
    timeframe: string,
    contentType?: string
  ): Promise<TrendingItem[]> {
    const trending: TrendingItem[] = [];
    
    try {
      // Get recent posts for trend analysis
      const posts = await PostService.getFeed({ limit: 200, sortBy: 'newest' });
      
      const now = new Date();
      const timeframeMs = this.getTimeframeMs(timeframe);
      const cutoffDate = new Date(now.getTime() - timeframeMs);
      
      for (const post of posts) {
        if (post.createdAt >= cutoffDate) {
          const trendMetrics = this.calculateTrendMetrics(post, timeframe);
          
          if (trendMetrics.trendScore > 0.3) { // Minimum threshold
            trending.push({
              id: post.id,
              type: 'post',
              data: post,
              trendScore: trendMetrics.trendScore,
              metrics: trendMetrics,
              timeframe: timeframe as any
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to calculate trending content:', error);
    }
    
    return trending.sort((a, b) => b.trendScore - a.trendScore);
  }

  private static calculateTrendMetrics(content: any, timeframe: string): any {
    const now = new Date();
    const ageHours = (now.getTime() - content.createdAt.getTime()) / (1000 * 60 * 60);
    const timeframeHours = this.getTimeframeMs(timeframe) / (1000 * 60 * 60);
    
    // Velocity score - how quickly it gained engagement
    const engagementRate = (content.upvotes + content.commentCount) / Math.max(ageHours, 1);
    const velocityScore = Math.min(engagementRate / 10, 1);
    
    // Momentum score - sustained engagement
    const recencyFactor = Math.max(0, 1 - (ageHours / timeframeHours));
    const momentumScore = velocityScore * recencyFactor;
    
    // Quality score - based on vote ratio
    const totalVotes = content.upvotes + content.downvotes;
    const qualityScore = totalVotes > 0 ? content.upvotes / totalVotes : 0.5;
    
    // Diversity score - engagement from different users (simplified)
    const diversityScore = Math.min(content.commentCount / 10, 1);
    
    const trendScore = (velocityScore * 0.4) + (momentumScore * 0.3) + (qualityScore * 0.2) + (diversityScore * 0.1);
    
    return {
      velocityScore,
      momentumScore,
      qualityScore,
      diversityScore,
      trendScore
    };
  }

  private static createRecommendationResult(
    content: any,
    userProfile: UserInterestProfile,
    category: RecommendationResult['category']
  ): RecommendationResult {
    const explanation = this.generateExplanation(content, userProfile, category);
    const freshness = this.calculateFreshness(content);
    
    return {
      id: content.id,
      type: content.contentType === 'comment' ? 'comment' : 'post',
      relevanceScore: content._finalScore || content._personalizedScore || content.trendScore || 0,
      data: content,
      highlights: [],
      explanation,
      category,
      freshness
    };
  }

  private static generateExplanation(
    content: any,
    userProfile: UserInterestProfile,
    category: string
  ): RecommendationExplanation {
    const factors: RecommendationExplanation['factors'] = [];
    let primaryReason = '';
    
    switch (category) {
      case 'personalized':
        primaryReason = 'Based on your interests and activity';
        
        if (content.tags?.some((tag: string) => userProfile.tags[tag] > 0)) {
          factors.push({
            factor: 'tag_interest',
            weight: 0.3,
            description: 'Matches your tag interests'
          });
        }
        
        if (content.subcommunityId && userProfile.subcommunities[content.subcommunityId]) {
          factors.push({
            factor: 'subcommunity_activity',
            weight: 0.25,
            description: 'From a community you\'re active in'
          });
        }
        break;
        
      case 'trending':
        primaryReason = 'Currently trending';
        factors.push({
          factor: 'trending',
          weight: 1.0,
          description: 'High engagement and momentum'
        });
        break;
        
      case 'discovery':
        primaryReason = 'Discover new content';
        factors.push({
          factor: 'discovery',
          weight: 1.0,
          description: 'From communities or authors you haven\'t explored'
        });
        break;
        
      case 'social':
        primaryReason = 'From your network';
        factors.push({
          factor: 'social_connection',
          weight: 1.0,
          description: 'Activity from people you follow or interact with'
        });
        break;
    }
    
    const confidence = Math.min(factors.reduce((sum, f) => sum + f.weight, 0) / factors.length, 1);
    
    return {
      primaryReason,
      factors,
      confidence
    };
  }

  private static calculateFreshness(content: any): number {
    const now = new Date();
    const ageHours = (now.getTime() - content.createdAt.getTime()) / (1000 * 60 * 60);
    
    // Freshness decays over 24 hours
    return Math.max(0, 1 - (ageHours / 24));
  }

  private static getActivityWeight(activityType: string): number {
    switch (activityType) {
      case 'view': return 0.1;
      case 'vote': return 0.5;
      case 'comment': return 1.0;
      case 'share': return 0.8;
      default: return 0.1;
    }
  }

  private static getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private static isTrendingCacheValid(): boolean {
    return (Date.now() - this.lastTrendingUpdate.getTime()) < this.TRENDING_CACHE_DURATION;
  }

  private static async getUnexploredSubcommunities(userId: string): Promise<Subcommunity[]> {
    // Mock implementation - in reality, this would check user's joined subcommunities
    try {
      return await SubcommunityService.getTrendingSubcommunities();
    } catch (error) {
      console.error('Failed to get unexplored subcommunities:', error);
      return [];
    }
  }

  private static async getNewAuthorsContent(userId: string, limit: number): Promise<any[]> {
    // Mock implementation - in reality, this would find authors user hasn't interacted with
    try {
      const posts = await PostService.getFeed({ limit: limit * 2, sortBy: 'newest' });
      return posts.filter(post => post.authorId !== userId).slice(0, limit);
    } catch (error) {
      console.error('Failed to get new authors content:', error);
      return [];
    }
  }

  private static scoreDiscoveryContent(content: any[], userProfile: UserInterestProfile): any[] {
    return content.map(item => {
      let score = 0.5; // Base discovery score
      
      // Boost if it's from a new subcommunity
      if (item._discoverySource === 'subcommunity') {
        score += 0.3;
      }
      
      // Quality boost
      const qarmaScore = (item.upvotes || 0) - (item.downvotes || 0);
      score += Math.min(qarmaScore / 20, 0.2);
      
      return {
        ...item,
        _discoveryScore: score
      };
    }).sort((a, b) => b._discoveryScore - a._discoveryScore);
  }

  private static async getUserSocialConnections(userId: string): Promise<string[]> {
    // Mock implementation - in reality, this would get user's social graph
    return [];
  }

  private static scoreSocialContent(
    content: any[], 
    userProfile: UserInterestProfile, 
    connections: string[]
  ): any[] {
    return content.map(item => {
      let score = 0.7; // Base social score
      
      // Boost based on connection strength (simplified)
      if (item._socialSource && connections.includes(item._socialSource)) {
        score += 0.3;
      }
      
      return {
        ...item,
        _socialScore: score
      };
    }).sort((a, b) => b._socialScore - a._socialScore);
  }
}