// Core Qonsent Module
// This is the public API for the Qonsent module

export { QonsentService } from './src/services/qonsent.service';
export { QonsentRule, IQonsentRule } from './src/models/QonsentRule';
export { QonsentLog, IQonsentLog, QonsentActionType } from './src/models/QonsentLog';
export { DAOVisibilityPolicy, IDAOVisibilityPolicy } from './src/models/DAOVisibilityPolicy';
export { Delegation, IDelegation } from './src/models/Delegation';

export * from './src/types';

// Re-export commonly used types and utilities
export type {
  SetQonsentParams,
  GetViewableResourcesParams,
  GetQonsentLogsParams,
  BatchSyncParams,
  CheckAccessParams,
  CheckAccessResult,
} from './src/services/qonsent.service';

// Initialize and export the default Qonsent service instance
import { QonsentService } from './src/services/qonsent.service';
const qonsentService = new QonsentService();

export default qonsentService;
