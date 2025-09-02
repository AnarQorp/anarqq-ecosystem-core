/**
 * Qflow Flow Definition Models
 * 
 * Core data models for flow definitions, steps, and metadata
 */

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  owner: string; // sQuid identity
  description?: string;
  steps: FlowStep[];
  metadata: FlowMetadata;
  daoPolicy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowStep {
  id: string;
  type: 'task' | 'condition' | 'parallel' | 'event-trigger' | 'module-call';
  action: string;
  params: Record<string, any>;
  onSuccess?: string;
  onFailure?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  resourceLimits?: ResourceLimits;
}

export interface FlowMetadata {
  tags: string[];
  category: string;
  visibility: 'public' | 'dao-only' | 'private';
  daoSubnet?: string;
  requiredPermissions: string[];
  estimatedDuration?: number;
  resourceRequirements?: ResourceRequirements;
  optimizations?: string[];
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  maxCpuPercent?: number;
  maxNetworkRequests?: number;
}

export interface ResourceRequirements {
  minMemoryMB: number;
  minCpuCores: number;
  requiredCapabilities: string[];
  networkAccess: boolean;
  storageAccess: boolean;
}

export interface ExecutionState {
  executionId: string;
  flowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  context: ExecutionContext;
  startTime: string;
  endTime?: string;
  error?: ExecutionError;
  checkpoints: Checkpoint[];
  nodeAssignments: Record<string, string>; // stepId -> nodeId
}

export interface ExecutionContext {
  triggeredBy: string; // sQuid identity
  triggerType: 'manual' | 'webhook' | 'event' | 'schedule';
  inputData: Record<string, any>;
  variables: Record<string, any>;
  daoSubnet?: string;
  permissions: string[];
}

export interface ExecutionError {
  type: ErrorType;
  message: string;
  stepId?: string;
  nodeId?: string;
  retryable: boolean;
  details: Record<string, any>;
  timestamp: string;
}

export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error',
  NODE_FAILURE = 'node_failure',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  TIMEOUT_ERROR = 'timeout_error',
  DAO_POLICY_VIOLATION = 'dao_policy_violation'
}

export interface Checkpoint {
  checkpointId: string;
  executionId: string;
  stepId: string;
  state: Record<string, any>;
  timestamp: string;
  signature: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Flow Definition Validation Schema
 */
export const FLOW_DEFINITION_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'version', 'owner', 'steps', 'metadata'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$',
      minLength: 1,
      maxLength: 100
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$'
    },
    owner: {
      type: 'string',
      minLength: 1
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    steps: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'type', 'action'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$'
          },
          type: {
            type: 'string',
            enum: ['task', 'condition', 'parallel', 'event-trigger', 'module-call']
          },
          action: {
            type: 'string',
            minLength: 1
          },
          params: {
            type: 'object'
          },
          onSuccess: {
            type: 'string'
          },
          onFailure: {
            type: 'string'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            maximum: 3600000
          }
        }
      }
    },
    metadata: {
      type: 'object',
      required: ['tags', 'category', 'visibility', 'requiredPermissions'],
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        category: {
          type: 'string',
          minLength: 1
        },
        visibility: {
          type: 'string',
          enum: ['public', 'dao-only', 'private']
        },
        requiredPermissions: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    }
  }
} as const;