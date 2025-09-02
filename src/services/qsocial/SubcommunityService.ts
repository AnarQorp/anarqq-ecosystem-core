import { 
  Subcommunity, 
  CreateSubcommunityRequest, 
  UpdateSubcommunityRequest,
  User,
  GovernanceRule
} from '../../types/qsocial';
import {
  validateCreateSubcommunityRequest,
  validateUpdateSubcommunityRequest,
  safeValidateCreateSubcommunityRequest,
  safeValidateUpdateSubcommunityRequest
} from '../../types/qsocial-validation';
import { getActiveIdentity } from '../../state/identity';
import { SubcommunityService as SubcommunityAPI } from '../../api/qsocial';

/**
 * Subcommunity content sanitization utilities
 */
export class SubcommunitySanitizer {
  /**
   * Sanitize subcommunity name to ensure it's URL-safe
   */
  static sanitizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 50);
  }

  /**
   * Sanitize display name
   */
  static sanitizeDisplayName(displayName: string): string {
    return displayName
      .trim()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .substring(0, 100);
  }

  /**
   * Sanitize description content
   */
  static sanitizeDescription(description: string): string {
    // Basic HTML sanitization for description
    return description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .substring(0, 1000);
  }

  /**
   * Sanitize community rules
   */
  static sanitizeRules(rules: string[]): string[] {
    return rules
      .map(rule => rule.trim())
      .filter(rule => rule.length > 0)
      .map(rule => rule.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''))
      .map(rule => rule.substring(0, 500))
      .slice(0, 20); // Max 20 rules
  }

  /**
   * Sanitize allowed content types
   */
  static sanitizeAllowedContentTypes(types: string[]): string[] {
    const validTypes = ['text', 'link', 'media', 'cross-post'];
    return types
      .filter(type => validTypes.includes(type))
      .slice(0, 4); // Max all 4 types
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsedUrl.toString();
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid protocol') {
        throw error;
      }
      throw new Error('Invalid URL format');
    }
  }
}

/**
 * Subcommunity validation utilities
 */
export class SubcommunityValidator {
  /**
   * Validate subcommunity name uniqueness and format
   */
  static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Subcommunity name is required');
    }
    
    const sanitizedName = name.trim().toLowerCase();
    
    if (sanitizedName.length < 3) {
      throw new Error('Subcommunity name must be at least 3 characters');
    }
    
    if (sanitizedName.length > 50) {
      throw new Error('Subcommunity name must be less than 50 characters');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedName)) {
      throw new Error('Subcommunity name can only contain letters, numbers, underscores, and hyphens');
    }
    
    // Reserved names
    const reservedNames = [
      'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'root', 'support',
      'help', 'news', 'blog', 'forum', 'chat', 'all', 'popular', 'trending',
      'search', 'settings', 'profile', 'user', 'users', 'mod', 'moderator',
      'qsocial', 'qpic', 'qmail', 'qmarket', 'qdrive', 'qchat', 'qonsent',
      'qindex', 'qlock', 'qwallet', 'squid', 'anarq'
    ];
    
    if (reservedNames.includes(sanitizedName)) {
      throw new Error('This subcommunity name is reserved');
    }
  }

  /**
   * Validate display name
   */
  static validateDisplayName(displayName: string): void {
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
    
    if (displayName.length > 100) {
      throw new Error('Display name must be less than 100 characters');
    }
  }

  /**
   * Validate minimum Qarma requirement
   */
  static validateMinimumQarma(minimumQarma: number): void {
    if (minimumQarma < 0) {
      throw new Error('Minimum Qarma must be non-negative');
    }
    
    if (minimumQarma > 10000) {
      throw new Error('Minimum Qarma requirement is too high (max: 10,000)');
    }
  }

  /**
   * Check if user can create subcommunities
   */
  static async validateCreationPermissions(): Promise<void> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to create subcommunities');
    }
    
    // TODO: Check user reputation requirements for creating subcommunities
    // For now, we'll allow any authenticated user to create subcommunities
    
    // TODO: Check if user has reached subcommunity creation limit
    // This would be implemented based on business rules
  }

  /**
   * Check if user can modify subcommunity
   */
  static async validateModificationPermissions(subcommunity: Subcommunity): Promise<void> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to modify subcommunities');
    }
    
    // Creator can always modify
    if (subcommunity.creatorId === identity.did) {
      return;
    }
    
    // Moderators can modify certain settings
    if (subcommunity.moderators.includes(identity.did)) {
      return;
    }
    
    // TODO: Check if user has admin privileges
    
    throw new Error('Insufficient permissions to modify this subcommunity');
  }

  /**
   * Validate governance rules
   */
  static validateGovernanceRules(rules: GovernanceRule[]): void {
    if (rules.length > 50) {
      throw new Error('Too many governance rules (max: 50)');
    }
    
    // Validate each rule
    rules.forEach((rule, index) => {
      if (!rule.id || rule.id.trim().length === 0) {
        throw new Error(`Governance rule ${index + 1} must have an ID`);
      }
      
      if (!rule.description || rule.description.trim().length === 0) {
        throw new Error(`Governance rule ${index + 1} must have a description`);
      }
      
      if (!['voting', 'threshold', 'automatic'].includes(rule.type)) {
        throw new Error(`Invalid governance rule type: ${rule.type}`);
      }
    });
  }
}

/**
 * Enhanced SubcommunityService with validation and sanitization
 */
export class SubcommunityService {
  /**
   * Create a new subcommunity with validation and sanitization
   */
  static async createSubcommunity(subcommunityData: CreateSubcommunityRequest): Promise<Subcommunity> {
    // Validate input data
    const validationResult = safeValidateCreateSubcommunityRequest(subcommunityData);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    // Additional business logic validation
    SubcommunityValidator.validateName(validatedData.name);
    SubcommunityValidator.validateDisplayName(validatedData.displayName);
    
    if (validatedData.minimumQarma !== undefined) {
      SubcommunityValidator.validateMinimumQarma(validatedData.minimumQarma);
    }
    
    await SubcommunityValidator.validateCreationPermissions();

    // Sanitize content
    const sanitizedSubcommunity: CreateSubcommunityRequest = {
      ...validatedData,
      name: SubcommunitySanitizer.sanitizeName(validatedData.name),
      displayName: SubcommunitySanitizer.sanitizeDisplayName(validatedData.displayName),
      description: SubcommunitySanitizer.sanitizeDescription(validatedData.description),
      rules: validatedData.rules ? SubcommunitySanitizer.sanitizeRules(validatedData.rules) : [],
      allowedContentTypes: validatedData.allowedContentTypes 
        ? SubcommunitySanitizer.sanitizeAllowedContentTypes(validatedData.allowedContentTypes)
        : ['text', 'link', 'media', 'cross-post'],
    };

    // Sanitize URLs if provided
    if (sanitizedSubcommunity.avatar) {
      sanitizedSubcommunity.avatar = SubcommunitySanitizer.sanitizeUrl(sanitizedSubcommunity.avatar);
    }
    
    if (sanitizedSubcommunity.banner) {
      sanitizedSubcommunity.banner = SubcommunitySanitizer.sanitizeUrl(sanitizedSubcommunity.banner);
    }

    // Create subcommunity via API
    try {
      const createdSubcommunity = await SubcommunityAPI.createSubcommunity(sanitizedSubcommunity);
      return createdSubcommunity;
    } catch (error) {
      console.error('Failed to create subcommunity:', error);
      throw new Error('Failed to create subcommunity. Please try again.');
    }
  }

  /**
   * Get a subcommunity by ID
   */
  static async getSubcommunity(id: string): Promise<Subcommunity> {
    if (!id || id.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    try {
      return await SubcommunityAPI.getSubcommunity(id);
    } catch (error) {
      console.error('Failed to get subcommunity:', error);
      throw new Error('Failed to retrieve subcommunity');
    }
  }

  /**
   * Update a subcommunity with validation and sanitization
   */
  static async updateSubcommunity(id: string, updates: UpdateSubcommunityRequest): Promise<Subcommunity> {
    if (!id || id.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    // Get existing subcommunity to check permissions
    const existingSubcommunity = await this.getSubcommunity(id);
    await SubcommunityValidator.validateModificationPermissions(existingSubcommunity);

    // Validate input data
    const validationResult = safeValidateUpdateSubcommunityRequest(updates);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedUpdates = validationResult.data;

    // Additional validation
    if (validatedUpdates.displayName) {
      SubcommunityValidator.validateDisplayName(validatedUpdates.displayName);
    }
    
    if (validatedUpdates.minimumQarma !== undefined) {
      SubcommunityValidator.validateMinimumQarma(validatedUpdates.minimumQarma);
    }
    
    if (validatedUpdates.governanceRules) {
      SubcommunityValidator.validateGovernanceRules(validatedUpdates.governanceRules);
    }

    // Sanitize content
    const sanitizedUpdates: UpdateSubcommunityRequest = {
      ...validatedUpdates,
    };

    if (validatedUpdates.displayName) {
      sanitizedUpdates.displayName = SubcommunitySanitizer.sanitizeDisplayName(validatedUpdates.displayName);
    }

    if (validatedUpdates.description) {
      sanitizedUpdates.description = SubcommunitySanitizer.sanitizeDescription(validatedUpdates.description);
    }

    if (validatedUpdates.rules) {
      sanitizedUpdates.rules = SubcommunitySanitizer.sanitizeRules(validatedUpdates.rules);
    }

    if (validatedUpdates.allowedContentTypes) {
      sanitizedUpdates.allowedContentTypes = SubcommunitySanitizer.sanitizeAllowedContentTypes(validatedUpdates.allowedContentTypes);
    }

    // Sanitize URLs if provided
    if (validatedUpdates.avatar) {
      sanitizedUpdates.avatar = SubcommunitySanitizer.sanitizeUrl(validatedUpdates.avatar);
    }
    
    if (validatedUpdates.banner) {
      sanitizedUpdates.banner = SubcommunitySanitizer.sanitizeUrl(validatedUpdates.banner);
    }

    try {
      return await SubcommunityAPI.updateSubcommunity(id, sanitizedUpdates);
    } catch (error) {
      console.error('Failed to update subcommunity:', error);
      throw new Error('Failed to update subcommunity. Please try again.');
    }
  }

  /**
   * Delete a subcommunity
   */
  static async deleteSubcommunity(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    // Get existing subcommunity to check permissions
    const existingSubcommunity = await this.getSubcommunity(id);
    await SubcommunityValidator.validateModificationPermissions(existingSubcommunity);

    try {
      await SubcommunityAPI.deleteSubcommunity(id);
    } catch (error) {
      console.error('Failed to delete subcommunity:', error);
      throw new Error('Failed to delete subcommunity. Please try again.');
    }
  }

  /**
   * Join a subcommunity
   */
  static async joinSubcommunity(subcommunityId: string): Promise<void> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to join subcommunities');
    }

    // Get subcommunity to check requirements
    const subcommunity = await this.getSubcommunity(subcommunityId);
    
    // TODO: Check if user meets minimum Qarma requirements
    // TODO: Check if subcommunity requires approval
    // TODO: Check if user is already a member

    try {
      await SubcommunityAPI.joinSubcommunity(subcommunityId);
    } catch (error) {
      console.error('Failed to join subcommunity:', error);
      throw new Error('Failed to join subcommunity. Please try again.');
    }
  }

  /**
   * Leave a subcommunity
   */
  static async leaveSubcommunity(subcommunityId: string): Promise<void> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to leave subcommunities');
    }

    try {
      await SubcommunityAPI.leaveSubcommunity(subcommunityId);
    } catch (error) {
      console.error('Failed to leave subcommunity:', error);
      throw new Error('Failed to leave subcommunity. Please try again.');
    }
  }

  /**
   * Get subcommunity members
   */
  static async getMembers(subcommunityId: string): Promise<User[]> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    try {
      return await SubcommunityAPI.getMembers(subcommunityId);
    } catch (error) {
      console.error('Failed to get subcommunity members:', error);
      throw new Error('Failed to retrieve subcommunity members');
    }
  }

  /**
   * Add moderator to subcommunity
   */
  static async addModerator(subcommunityId: string, userId: string): Promise<void> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }
    
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Get existing subcommunity to check permissions
    const existingSubcommunity = await this.getSubcommunity(subcommunityId);
    await SubcommunityValidator.validateModificationPermissions(existingSubcommunity);

    try {
      await SubcommunityAPI.addModerator(subcommunityId, userId);
    } catch (error) {
      console.error('Failed to add moderator:', error);
      throw new Error('Failed to add moderator. Please try again.');
    }
  }

  /**
   * Remove moderator from subcommunity
   */
  static async removeModerator(subcommunityId: string, userId: string): Promise<void> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }
    
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Get existing subcommunity to check permissions
    const existingSubcommunity = await this.getSubcommunity(subcommunityId);
    await SubcommunityValidator.validateModificationPermissions(existingSubcommunity);

    try {
      await SubcommunityAPI.removeModerator(subcommunityId, userId);
    } catch (error) {
      console.error('Failed to remove moderator:', error);
      throw new Error('Failed to remove moderator. Please try again.');
    }
  }

  /**
   * Search subcommunities with validation
   */
  static async searchSubcommunities(query: string): Promise<Subcommunity[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const sanitizedQuery = query.trim().substring(0, 100);

    try {
      return await SubcommunityAPI.searchSubcommunities(sanitizedQuery);
    } catch (error) {
      console.error('Failed to search subcommunities:', error);
      throw new Error('Failed to search subcommunities');
    }
  }

  /**
   * Get trending subcommunities
   */
  static async getTrendingSubcommunities(): Promise<Subcommunity[]> {
    try {
      return await SubcommunityAPI.getTrendingSubcommunities();
    } catch (error) {
      console.error('Failed to get trending subcommunities:', error);
      throw new Error('Failed to retrieve trending subcommunities');
    }
  }

  /**
   * Check if current user can edit subcommunity
   */
  static async canEditSubcommunity(subcommunity: Subcommunity): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // Creator can edit
    if (subcommunity.creatorId === identity.did) return true;

    // Moderators can edit certain settings
    if (subcommunity.moderators.includes(identity.did)) return true;

    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Check if current user can delete subcommunity
   */
  static async canDeleteSubcommunity(subcommunity: Subcommunity): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // Only creator can delete (for now)
    if (subcommunity.creatorId === identity.did) return true;

    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Check if current user can moderate subcommunity
   */
  static async canModerateSubcommunity(subcommunity: Subcommunity): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // Creator can moderate
    if (subcommunity.creatorId === identity.did) return true;

    // Moderators can moderate
    if (subcommunity.moderators.includes(identity.did)) return true;

    // TODO: Check if user has admin privileges
    // TODO: Check if user meets Qarma requirements for auto-moderation

    return false;
  }

  /**
   * Get subcommunity statistics
   */
  static getSubcommunityStatistics(subcommunity: Subcommunity) {
    const growthRate = subcommunity.memberCount > 0 ? subcommunity.postCount / subcommunity.memberCount : 0;
    const isActive = subcommunity.postCount > 10 && subcommunity.memberCount > 5;
    const isPopular = subcommunity.memberCount > 100;
    const isTrending = growthRate > 0.5 && subcommunity.memberCount > 20;

    return {
      memberCount: subcommunity.memberCount,
      postCount: subcommunity.postCount,
      growthRate: Math.round(growthRate * 100) / 100,
      isActive,
      isPopular,
      isTrending,
      moderatorCount: subcommunity.moderators.length,
      ruleCount: subcommunity.rules.length,
      hasGovernance: subcommunity.governanceRules.length > 0,
      isPrivate: subcommunity.isPrivate,
      requiresApproval: subcommunity.requiresApproval,
    };
  }

  /**
   * Format subcommunity for display
   */
  static formatSubcommunityForDisplay(subcommunity: Subcommunity) {
    const stats = this.getSubcommunityStatistics(subcommunity);
    
    return {
      ...subcommunity,
      stats,
      formattedCreatedAt: new Date(subcommunity.createdAt).toLocaleString(),
      canEdit: false, // Will be set by component
      canDelete: false, // Will be set by component
      canModerate: false, // Will be set by component
      membershipStatus: 'unknown', // Will be set by component
    };
  }

  /**
   * Validate subcommunity name availability (placeholder)
   */
  static async isNameAvailable(name: string): Promise<boolean> {
    if (!name || name.trim().length === 0) {
      return false;
    }

    const sanitizedName = SubcommunitySanitizer.sanitizeName(name);
    
    try {
      // Try to get subcommunity with this name
      await this.getSubcommunity(sanitizedName);
      return false; // Name is taken
    } catch (error) {
      // If we get an error (likely 404), the name is available
      return true;
    }
  }

  /**
   * Get subcommunity suggestions based on user interests (placeholder)
   */
  static async getSubcommunitySuggestions(): Promise<Subcommunity[]> {
    // TODO: Implement recommendation algorithm based on user activity
    // For now, return trending subcommunities
    try {
      return await this.getTrendingSubcommunities();
    } catch (error) {
      console.error('Failed to get subcommunity suggestions:', error);
      return [];
    }
  }
}