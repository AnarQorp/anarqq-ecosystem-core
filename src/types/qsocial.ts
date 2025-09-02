// Core data models for Qsocial
// Validation schemas are available in qsocial-validation.ts

/**
 * Privacy levels for content
 */
export enum PrivacyLevel {
  PUBLIC = 'public',
  COMMUNITY = 'community', 
  PRIVATE = 'private'
}

/**
 * Content types for posts
 */
export enum ContentType {
  TEXT = 'text',
  LINK = 'link',
  MEDIA = 'media',
  CROSS_POST = 'cross-post'
}

/**
 * Moderation status for content
 */
export enum ModerationStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  HIDDEN = 'hidden',
  REMOVED = 'removed'
}

/**
 * Moderation levels for users
 */
export enum ModerationLevel {
  NONE = 'none',
  COMMUNITY = 'community',
  GLOBAL = 'global'
}

/**
 * Source modules for cross-posting
 */
export type SourceModule = 'qpic' | 'qmail' | 'qmarket' | 'qdrive' | 'qchat';

/**
 * Ecosystem integration data for files
 */
export interface EcosystemFileData {
  qonsent: {
    profileId: string;
    visibility: string;
    encryptionLevel: string;
  };
  qlock: {
    encrypted: boolean;
    encryptionLevel: string;
    keyId?: string;
  };
  ipfs: {
    cid?: string;
    generated: boolean;
    gatewayUrls?: string[];
  };
  qindex: {
    indexId: string;
    searchable: boolean;
  };
  qnet: {
    routingId: string;
    routedUrl: string;
    accessToken?: string;
  };
  filecoin?: {
    filecoinCid?: string;
    dealStatus?: string;
    dealId?: string;
  };
}

/**
 * File attachment with ecosystem integration
 */
export interface QsocialFileAttachment {
  fileId: string;
  originalName: string;
  storjUrl: string;
  storjKey: string;
  fileSize: number;
  contentType: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  ecosystem: EcosystemFileData;
  processingTime?: number;
}

/**
 * Identity interface (from sQuid system)
 * Re-using the existing SquidIdentity interface from state/identity
 */
export interface Identity {
  did: string;
  name: string;
  type: 'ROOT' | 'SUB';
  kyc: boolean;
  reputation: number;
  space?: string;
  email?: string;
  avatar?: string;
  cid_profile?: string;
  createdAt?: string;
  lastLogin?: string;
  isAuthenticated?: boolean;
  token?: string;
  permissions?: string[];
  provider?: string;
  signMessage?: (message: string) => Promise<string>;
  encrypt?: (data: string) => Promise<string>;
  decrypt?: (encryptedData: string) => Promise<string>;
  getToken?: () => Promise<string>;
  // For compatibility with API calls
  sign?: (message: string) => Promise<string>;
}

/**
 * Governance rule for subcommunities
 */
export interface GovernanceRule {
  id: string;
  type: 'voting' | 'threshold' | 'automatic';
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
}

/**
 * Badge for user achievements
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

/**
 * Achievement for user accomplishments
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  unlockedAt: Date;
}

/**
 * Qarma event for reputation history
 */
export interface QarmaEvent {
  id: string;
  type: 'post_upvote' | 'post_downvote' | 'comment_upvote' | 'comment_downvote' | 'post_created' | 'comment_created';
  points: number;
  sourceId: string; // post or comment ID
  subcommunityId?: string;
  timestamp: Date;
}

/**
 * Main post interface
 */
export interface QsocialPost {
  id: string;
  authorId: string;
  authorIdentity: Identity;
  title: string;
  content: string;
  contentType: ContentType;
  
  // Cross-module integration
  sourceModule?: SourceModule;
  sourceId?: string;
  sourceData?: any;
  
  // Community organization
  subcommunityId?: string;
  tags: string[];
  
  // Engagement metrics
  upvotes: number;
  downvotes: number;
  commentCount: number;
  
  // Storage and privacy
  ipfsHash?: string;
  storjCid?: string;
  privacyLevel: PrivacyLevel;
  
  // Ecosystem-integrated file attachments
  attachments?: QsocialFileAttachment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  isPinned: boolean;
  isLocked: boolean;
  
  // Moderation
  moderationStatus: ModerationStatus;
  moderatedBy?: string;
  moderationReason?: string;
}

/**
 * Comment interface with threading support
 */
export interface QsocialComment {
  id: string;
  postId: string;
  authorId: string;
  authorIdentity: Identity;
  content: string;
  
  // Threading
  parentCommentId?: string;
  depth: number;
  childrenIds: string[];
  
  // Engagement
  upvotes: number;
  downvotes: number;
  
  // Storage
  ipfsHash?: string;
  privacyLevel: PrivacyLevel;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  
  // Moderation
  moderationStatus: ModerationStatus;
  moderatedBy?: string;
}

/**
 * Subcommunity interface
 */
export interface Subcommunity {
  id: string;
  name: string;
  displayName: string;
  description: string;
  
  // Governance
  creatorId: string;
  moderators: string[];
  daoAddress?: string;
  governanceRules: GovernanceRule[];
  
  // Community settings
  isPrivate: boolean;
  requiresApproval: boolean;
  minimumQarma: number;
  allowedContentTypes: string[];
  
  // Statistics
  memberCount: number;
  postCount: number;
  
  // Metadata
  createdAt: Date;
  avatar?: string;
  banner?: string;
  rules: string[];
  
  // Storage
  ipfsHash?: string;
}

/**
 * User reputation interface
 */
export interface UserReputation {
  userId: string;
  totalQarma: number;
  postQarma: number;
  commentQarma: number;
  
  // Subcommunity-specific qarma
  subcommunityQarma: Record<string, number>;
  
  // Achievements and badges
  badges: Badge[];
  achievements: Achievement[];
  
  // Moderation privileges
  moderationLevel: ModerationLevel;
  canModerate: string[]; // subcommunity IDs
  
  // Reputation history
  qarmaHistory: QarmaEvent[];
  
  // Metadata
  lastUpdated: Date;
}

// Request/Response types for API

/**
 * Request to create a new post
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  contentType: ContentType;
  subcommunityId?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  
  // Cross-module integration
  sourceModule?: SourceModule;
  sourceId?: string;
  sourceData?: any;
  
  // Ecosystem-integrated file attachments
  attachments?: QsocialFileAttachment[];
}

/**
 * Request to update a post
 */
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  isPinned?: boolean;
  isLocked?: boolean;
}

/**
 * Request to create a new comment
 */
export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
  privacyLevel?: PrivacyLevel;
}

/**
 * Request to update a comment
 */
export interface UpdateCommentRequest {
  content?: string;
  privacyLevel?: PrivacyLevel;
}

/**
 * Request to create a new subcommunity
 */
export interface CreateSubcommunityRequest {
  name: string;
  displayName: string;
  description: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  minimumQarma?: number;
  allowedContentTypes?: string[];
  rules?: string[];
  avatar?: string;
  banner?: string;
}

/**
 * Request to update a subcommunity
 */
export interface UpdateSubcommunityRequest {
  displayName?: string;
  description?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  minimumQarma?: number;
  allowedContentTypes?: string[];
  rules?: string[];
  avatar?: string;
  banner?: string;
  governanceRules?: GovernanceRule[];
}

/**
 * Options for fetching feeds
 */
export interface FeedOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'controversial';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Options for fetching comments
 */
export interface CommentOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'popular';
  maxDepth?: number;
}

/**
 * Result of a voting action
 */
export interface VoteResult {
  success: boolean;
  newUpvotes: number;
  newDownvotes: number;
  qarmaChange: number;
  userVote: 'up' | 'down' | null;
}

/**
 * Options for creating cross-posts
 */
export interface CrossPostOptions {
  title?: string;
  additionalContent?: string;
  subcommunityId?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
}

/**
 * User interface (simplified)
 */
export interface User {
  id: string;
  did: string;
  displayName?: string;
  avatar?: string;
  reputation?: UserReputation;
}

/**
 * Search result interface
 */
export interface SearchResult {
  posts: QsocialPost[];
  comments: QsocialComment[];
  subcommunities: Subcommunity[];
  users: User[];
  total: number;
}

/**
 * Notification interface
 */
export interface QsocialNotification {
  id: string;
  userId: string;
  type: 'vote' | 'comment' | 'mention' | 'moderation' | 'achievement';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Activity interface for dashboard
 */
export interface ModuleActivity {
  moduleId: SourceModule;
  moduleName: string;
  activities: ActivityItem[];
  lastUpdated: Date;
}

/**
 * Individual activity item
 */
export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Dashboard data interface
 */
export interface DashboardData {
  recentPosts: QsocialPost[];
  moduleActivities: ModuleActivity[];
  notifications: QsocialNotification[];
  trendingSubcommunities: Subcommunity[];
  userStats: {
    totalPosts: number;
    totalComments: number;
    totalQarma: number;
    joinedCommunities: number;
  };
}