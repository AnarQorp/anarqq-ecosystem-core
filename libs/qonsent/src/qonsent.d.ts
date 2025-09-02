// Type definitions for @anarq/qonsent
// Project: AnarQ Qonsent Module
// Definitions by: AnarQ Team

// Import types
import { QonsentService } from './services/qonsent.service';
import {
  QonsentConfig,
  SetQonsentParams,
  GetViewableResourcesParams,
  GetQonsentLogsParams,
  BatchSyncParams,
  CheckAccessParams,
  CheckAccessResult,
  PermissionLevel,
  VisibilityLevel,
  IQonsentRule,
  IQonsentLog,
  IDAOVisibilityPolicy,
  IDelegation,
  IQonsentRuleModel,
  IQonsentLogModel,
  IDAOVisibilityPolicyModel,
  IDelegationModel
} from './types/qonsent.types';

declare const qonsent: {
  init: (config?: QonsentConfig) => QonsentService;
  QonsentService: typeof QonsentService;
};

export {
  QonsentService,
  QonsentConfig,
  SetQonsentParams,
  GetViewableResourcesParams,
  GetQonsentLogsParams,
  BatchSyncParams,
  CheckAccessParams,
  CheckAccessResult,
  PermissionLevel,
  VisibilityLevel,
  IQonsentRule,
  IQonsentLog,
  IDAOVisibilityPolicy,
  IDelegation,
  IQonsentRuleModel,
  IQonsentLogModel,
  IDAOVisibilityPolicyModel,
  IDelegationModel
};

export default qonsent;

// Global augmentation for Express
declare global {
  namespace Express {
    interface Request {
      qonsent?: {
        hasPermission: (permission: string) => boolean;
        getPermissions: () => string[];
      };
    }
  }
}
