import { z } from 'zod';
import {
  ContentType,
  ModerationStatus,
  ModerationLevel,
  PrivacyLevel,
  SourceModule
} from './qsocial';

// Base validation schemas for enums
export const ContentTypeSchema = z.nativeEnum(ContentType);
export const ModerationStatusSchema = z.nativeEnum(ModerationStatus);
export const ModerationLevelSchema = z.nativeEnum(ModerationLevel);
export const PrivacyLevelSchema = z.nativeEnum(PrivacyLevel);
export const SourceModuleSchema = z.enum(['qpic', 'qmail', 'qmarket', 'qdrive', 'qchat']);

// Identity validation schema
export const IdentitySchema = z.object({
  did: z.string().min(1, 'DID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['ROOT', 'SUB']),
  kyc: z.boolean(),
  reputation: z.number().min(0),
  space: z.string().optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  cid_profile: z.string().optional(),
  createdAt: z.string().optional(),
  lastLogin: z.string().optional(),
  isAuthenticated: z.boolean().optional(),
  token: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  provider: z.string().optional(),
  signMessage: z.function().optional(),
  encrypt: z.function().optional(),
  decrypt: z.function().optional(),
  getToken: z.function().optional(),
  sign: z.function().optional(),
});

// Governance rule validation schema
export const GovernanceRuleSchema = z.object({
  id: z.string().min(1, 'Governance rule ID is required'),
  type: z.enum(['voting', 'threshold', 'automatic']),
  description: z.string().min(1, 'Description is required'),
  parameters: z.record(z.any()),
  isActive: z.boolean(),
});

// Badge validation schema
export const BadgeSchema = z.object({
  id: z.string().min(1, 'Badge ID is required'),
  name: z.string().min(1, 'Badge name is required'),
  description: z.string().min(1, 'Badge description is required'),
  icon: z.string().min(1, 'Badge icon is required'),
  earnedAt: z.date(),
});

// Achievement validation schema
export const AchievementSchema = z.object({
  id: z.string().min(1, 'Achievement ID is required'),
  name: z.string().min(1, 'Achievement name is required'),
  description: z.string().min(1, 'Achievement description is required'),
  category: z.string().min(1, 'Achievement category is required'),
  points: z.number().min(0, 'Achievement points must be non-negative'),
  unlockedAt: z.date(),
});

// Qarma event validation schema
export const QarmaEventSchema = z.object({
  id: z.string().min(1, 'Qarma event ID is required'),
  type: z.enum(['post_upvote', 'post_downvote', 'comment_upvote', 'comment_downvote', 'post_created', 'comment_created']),
  points: z.number(),
  sourceId: z.string().min(1, 'Source ID is required'),
  subcommunityId: z.string().optional(),
  timestamp: z.date(),
});

// QsocialPost validation schema
export const QsocialPostSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  authorId: z.string().min(1, 'Author ID is required'),
  authorIdentity: IdentitySchema,
  title: z.string().min(1, 'Post title is required').max(300, 'Title must be less than 300 characters'),
  content: z.string().max(50000, 'Content must be less than 50,000 characters'),
  contentType: ContentTypeSchema,
  
  // Cross-module integration
  sourceModule: SourceModuleSchema.optional(),
  sourceId: z.string().optional(),
  sourceData: z.any().optional(),
  
  // Community organization
  subcommunityId: z.string().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed'),
  
  // Engagement metrics
  upvotes: z.number().min(0, 'Upvotes must be non-negative'),
  downvotes: z.number().min(0, 'Downvotes must be non-negative'),
  commentCount: z.number().min(0, 'Comment count must be non-negative'),
  
  // Storage and privacy
  ipfsHash: z.string().optional(),
  storjCid: z.string().optional(),
  privacyLevel: PrivacyLevelSchema,
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  isEdited: z.boolean(),
  isPinned: z.boolean(),
  isLocked: z.boolean(),
  
  // Moderation
  moderationStatus: ModerationStatusSchema,
  moderatedBy: z.string().optional(),
  moderationReason: z.string().optional(),
});

// QsocialComment validation schema
export const QsocialCommentSchema = z.object({
  id: z.string().min(1, 'Comment ID is required'),
  postId: z.string().min(1, 'Post ID is required'),
  authorId: z.string().min(1, 'Author ID is required'),
  authorIdentity: IdentitySchema,
  content: z.string().min(1, 'Comment content is required').max(10000, 'Comment must be less than 10,000 characters'),
  
  // Threading
  parentCommentId: z.string().optional(),
  depth: z.number().min(0, 'Depth must be non-negative').max(10, 'Maximum comment depth is 10'),
  childrenIds: z.array(z.string()),
  
  // Engagement
  upvotes: z.number().min(0, 'Upvotes must be non-negative'),
  downvotes: z.number().min(0, 'Downvotes must be non-negative'),
  
  // Storage
  ipfsHash: z.string().optional(),
  privacyLevel: PrivacyLevelSchema,
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  isEdited: z.boolean(),
  
  // Moderation
  moderationStatus: ModerationStatusSchema,
  moderatedBy: z.string().optional(),
});

// Subcommunity validation schema
export const SubcommunitySchema = z.object({
  id: z.string().min(1, 'Subcommunity ID is required'),
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  
  // Governance
  creatorId: z.string().min(1, 'Creator ID is required'),
  moderators: z.array(z.string()),
  daoAddress: z.string().optional(),
  governanceRules: z.array(GovernanceRuleSchema),
  
  // Community settings
  isPrivate: z.boolean(),
  requiresApproval: z.boolean(),
  minimumQarma: z.number().min(0, 'Minimum Qarma must be non-negative'),
  allowedContentTypes: z.array(z.string()),
  
  // Statistics
  memberCount: z.number().min(0, 'Member count must be non-negative'),
  postCount: z.number().min(0, 'Post count must be non-negative'),
  
  // Metadata
  createdAt: z.date(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  rules: z.array(z.string().max(500, 'Rule must be less than 500 characters')).max(20, 'Maximum 20 rules allowed'),
  
  // Storage
  ipfsHash: z.string().optional(),
});

// UserReputation validation schema
export const UserReputationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  totalQarma: z.number(),
  postQarma: z.number(),
  commentQarma: z.number(),
  
  // Subcommunity-specific qarma
  subcommunityQarma: z.record(z.number()),
  
  // Achievements and badges
  badges: z.array(BadgeSchema),
  achievements: z.array(AchievementSchema),
  
  // Moderation privileges
  moderationLevel: ModerationLevelSchema,
  canModerate: z.array(z.string()),
  
  // Reputation history
  qarmaHistory: z.array(QarmaEventSchema),
  
  // Metadata
  lastUpdated: z.date(),
});

// Request validation schemas

// CreatePostRequest validation schema
export const CreatePostRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title must be less than 300 characters'),
  content: z.string().max(50000, 'Content must be less than 50,000 characters'),
  contentType: ContentTypeSchema,
  subcommunityId: z.string().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed').optional(),
  privacyLevel: PrivacyLevelSchema.optional().default(PrivacyLevel.PUBLIC),
  
  // Cross-module integration
  sourceModule: SourceModuleSchema.optional(),
  sourceId: z.string().optional(),
  sourceData: z.any().optional(),
});

// UpdatePostRequest validation schema
export const UpdatePostRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title must be less than 300 characters').optional(),
  content: z.string().max(50000, 'Content must be less than 50,000 characters').optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed').optional(),
  privacyLevel: PrivacyLevelSchema.optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

// CreateCommentRequest validation schema
export const CreateCommentRequestSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  content: z.string().min(1, 'Comment content is required').max(10000, 'Comment must be less than 10,000 characters'),
  parentCommentId: z.string().optional(),
  privacyLevel: PrivacyLevelSchema.optional().default(PrivacyLevel.PUBLIC),
});

// UpdateCommentRequest validation schema
export const UpdateCommentRequestSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(10000, 'Comment must be less than 10,000 characters').optional(),
  privacyLevel: PrivacyLevelSchema.optional(),
});

// CreateSubcommunityRequest validation schema
export const CreateSubcommunityRequestSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  isPrivate: z.boolean().optional().default(false),
  requiresApproval: z.boolean().optional().default(false),
  minimumQarma: z.number().min(0, 'Minimum Qarma must be non-negative').optional().default(0),
  allowedContentTypes: z.array(z.string()).optional(),
  rules: z.array(z.string().max(500, 'Rule must be less than 500 characters')).max(20, 'Maximum 20 rules allowed').optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
});

// UpdateSubcommunityRequest validation schema
export const UpdateSubcommunityRequestSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  isPrivate: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  minimumQarma: z.number().min(0, 'Minimum Qarma must be non-negative').optional(),
  allowedContentTypes: z.array(z.string()).optional(),
  rules: z.array(z.string().max(500, 'Rule must be less than 500 characters')).max(20, 'Maximum 20 rules allowed').optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  governanceRules: z.array(GovernanceRuleSchema).optional(),
});

// FeedOptions validation schema
export const FeedOptionsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['newest', 'oldest', 'popular', 'controversial']).optional().default('newest'),
  timeRange: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional().default('all'),
});

// CommentOptions validation schema
export const CommentOptionsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['newest', 'oldest', 'popular']).optional().default('newest'),
  maxDepth: z.number().min(0).max(10).optional().default(10),
});

// VoteResult validation schema
export const VoteResultSchema = z.object({
  success: z.boolean(),
  newUpvotes: z.number().min(0),
  newDownvotes: z.number().min(0),
  qarmaChange: z.number(),
  userVote: z.enum(['up', 'down']).nullable(),
});

// CrossPostOptions validation schema
export const CrossPostOptionsSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  additionalContent: z.string().max(10000).optional(),
  subcommunityId: z.string().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  privacyLevel: PrivacyLevelSchema.optional().default(PrivacyLevel.PUBLIC),
});

// User validation schema
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  did: z.string().min(1, 'DID is required'),
  displayName: z.string().optional(),
  avatar: z.string().url().optional(),
  reputation: UserReputationSchema.optional(),
});

// QsocialNotification validation schema
export const QsocialNotificationSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['vote', 'comment', 'mention', 'moderation', 'achievement']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.any(),
  isRead: z.boolean(),
  createdAt: z.date(),
});

// ActivityItem validation schema
export const ActivityItemSchema = z.object({
  id: z.string().min(1, 'Activity ID is required'),
  type: z.string().min(1, 'Activity type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  url: z.string().url('Invalid URL'),
  timestamp: z.date(),
  metadata: z.any().optional(),
});

// ModuleActivity validation schema
export const ModuleActivitySchema = z.object({
  moduleId: SourceModuleSchema,
  moduleName: z.string().min(1, 'Module name is required'),
  activities: z.array(ActivityItemSchema),
  lastUpdated: z.date(),
});

// DashboardData validation schema
export const DashboardDataSchema = z.object({
  recentPosts: z.array(QsocialPostSchema),
  moduleActivities: z.array(ModuleActivitySchema),
  notifications: z.array(QsocialNotificationSchema),
  trendingSubcommunities: z.array(SubcommunitySchema),
  userStats: z.object({
    totalPosts: z.number().min(0),
    totalComments: z.number().min(0),
    totalQarma: z.number(),
    joinedCommunities: z.number().min(0),
  }),
});

// SearchResult validation schema
export const SearchResultSchema = z.object({
  posts: z.array(QsocialPostSchema),
  comments: z.array(QsocialCommentSchema),
  subcommunities: z.array(SubcommunitySchema),
  users: z.array(UserSchema),
  total: z.number().min(0),
});

// Utility functions for validation
export const validatePost = (data: unknown) => QsocialPostSchema.parse(data);
export const validateComment = (data: unknown) => QsocialCommentSchema.parse(data);
export const validateSubcommunity = (data: unknown) => SubcommunitySchema.parse(data);
export const validateUserReputation = (data: unknown) => UserReputationSchema.parse(data);

export const validateCreatePostRequest = (data: unknown) => CreatePostRequestSchema.parse(data);
export const validateUpdatePostRequest = (data: unknown) => UpdatePostRequestSchema.parse(data);
export const validateCreateCommentRequest = (data: unknown) => CreateCommentRequestSchema.parse(data);
export const validateUpdateCommentRequest = (data: unknown) => UpdateCommentRequestSchema.parse(data);
export const validateCreateSubcommunityRequest = (data: unknown) => CreateSubcommunityRequestSchema.parse(data);
export const validateUpdateSubcommunityRequest = (data: unknown) => UpdateSubcommunityRequestSchema.parse(data);

export const validateFeedOptions = (data: unknown) => FeedOptionsSchema.parse(data);
export const validateCommentOptions = (data: unknown) => CommentOptionsSchema.parse(data);
export const validateCrossPostOptions = (data: unknown) => CrossPostOptionsSchema.parse(data);

// Safe validation functions that return results instead of throwing
export const safeValidatePost = (data: unknown) => QsocialPostSchema.safeParse(data);
export const safeValidateComment = (data: unknown) => QsocialCommentSchema.safeParse(data);
export const safeValidateSubcommunity = (data: unknown) => SubcommunitySchema.safeParse(data);
export const safeValidateUserReputation = (data: unknown) => UserReputationSchema.safeParse(data);

export const safeValidateCreatePostRequest = (data: unknown) => CreatePostRequestSchema.safeParse(data);
export const safeValidateUpdatePostRequest = (data: unknown) => UpdatePostRequestSchema.safeParse(data);
export const safeValidateCreateCommentRequest = (data: unknown) => CreateCommentRequestSchema.safeParse(data);
export const safeValidateUpdateCommentRequest = (data: unknown) => UpdateCommentRequestSchema.safeParse(data);
export const safeValidateCreateSubcommunityRequest = (data: unknown) => CreateSubcommunityRequestSchema.safeParse(data);
export const safeValidateUpdateSubcommunityRequest = (data: unknown) => UpdateSubcommunityRequestSchema.safeParse(data);