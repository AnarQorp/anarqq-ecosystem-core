// Core types for the Qonsent module

// Base interface for all database documents
export interface IBaseDocument {
  _id: any;
  createdAt: Date;
  updatedAt: Date;
}

// Permission levels
export enum PermissionLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// Resource visibility levels
export enum VisibilityLevel {
  PRIVATE = 'private',
  DAO_MEMBERS = 'dao_members',
  PUBLIC = 'public'
}

// Qonsent Rule document interface
export interface IQonsentRule extends IBaseDocument {
  resourceId: string;
  ownerDid: string;
  targetDid?: string;
  daoScope?: string;
  permissions: string[];
  expiresAt?: Date;
  isActive: boolean;
}

// Qonsent Log document interface
export interface IQonsentLog extends IBaseDocument {
  actorDid: string;
  action: string;
  resourceId?: string;
  targetDid?: string;
  daoScope?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// DAO Visibility Policy document interface
export interface IDAOVisibilityPolicy extends IBaseDocument {
  daoId: string;
  resourceType: string;
  defaultVisibility: VisibilityLevel;
  allowedOverrides: PermissionLevel[];
  requiresApproval: boolean;
}

// Delegation document interface
export interface IDelegation extends IBaseDocument {
  delegatorDid: string;
  delegateeDid: string;
  resourceId: string;
  permissions: string[];
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// Model interfaces for type-safe model references
export interface IQonsentRuleModel extends IBaseDocument, IQonsentRule {}
export interface IQonsentLogModel extends IBaseDocument, IQonsentLog {}
export interface IDAOVisibilityPolicyModel extends IBaseDocument, IDAOVisibilityPolicy {}
export interface IDelegationModel extends IBaseDocument, IDelegation {}

// Service parameter and result types
export interface SetQonsentParams {
  resourceId: string;
  ownerDid: string;
  targetDid: string;
  permissions: string[];
  expiresAt?: Date;
  daoScope?: string;
}

export interface GetViewableResourcesParams {
  targetDid: string;
  resourceType?: string;
  limit: number;
  offset: number;
}

export interface BatchSyncParams {
  items: Array<{
    resourceId: string;
    ownerDid: string;
    targetDid: string;
    permissions: string[];
    expiresAt?: Date;
    daoScope?: string;
  }>;
}

export interface GetQonsentLogsParams {
  actorDid?: string;
  resourceId?: string;
  targetDid?: string;
  daoId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export interface CheckAccessParams {
  resourceId: string;
  targetDid: string;
  daoScope?: string;
  returnRequiredPermissions?: boolean;
}

export interface CheckAccessResult {
  hasAccess: boolean;
  reason: string;
  level: string;
  requiredPermissions?: string[];
}

export interface QonsentLogParams {
  actorDid: string;
  action: string;
  resourceId?: string;
  targetDid?: string;
  daoScope?: string;
  metadata?: Record<string, any>;
}

// Configuration interface
export interface QonsentConfig {
  /** Logging level for the Qonsent module */
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  
  /** Database connection string */
  databaseUrl?: string;
  
  /** Enable/disable debug mode */
  debug?: boolean;
  
  /** Additional configuration options */
  [key: string]: any;
}
