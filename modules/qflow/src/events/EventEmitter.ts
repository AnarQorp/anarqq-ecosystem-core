import { EventEmitter } from 'events';
import { schemaRegistry, QflowEvent } from '../schemas/SchemaRegistry.js';

/**
 * Qflow Event Emitter
 * Simple event emitter for Qflow events (will be enhanced with ecosystem integration later)
 */
export class QflowEventEmitter extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Emit a simple event (basic implementation)
   */
  emit(eventType: string, data: any): boolean {
    console.log(`[QflowEventEmitter] Emitting event: ${eventType}`, data);
    return super.emit(eventType, data);
  }

  /**
   * Emit a flow created event
   */
  public async emitFlowCreated(
    actor: string,
    flowData: {
      flowId: string;
      flowName: string;
      flowVersion: string;
      owner: string;
      daoSubnet?: string;
      metadata?: any;
      ipfsCid: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.created.v1',
      actor,
      flowData
    );

    this.emit('q.qflow.flow.created.v1', event);
  }

  /**
   * Emit an execution started event
   */
  public async emitExecutionStarted(
    actor: string,
    executionData: {
      executionId: string;
      flowId: string;
      flowVersion: string;
      triggerType: 'manual' | 'webhook' | 'event' | 'schedule';
      daoSubnet?: string;
      inputData?: any;
      context?: any;
      estimatedDuration?: number;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.exec.started.v1',
      actor,
      executionData
    );

    this.emit('q.qflow.exec.started.v1', event);
  }

  /**
   * Emit a step dispatched event
   */
  public async emitStepDispatched(
    actor: string,
    stepData: {
      executionId: string;
      stepId: string;
      stepType: 'task' | 'condition' | 'parallel' | 'event-trigger' | 'module-call';
      targetNodeId: string;
      nodeCapabilities?: string[];
      stepPayload: {
        action: string;
        params?: any;
        resourceLimits?: any;
      };
      validationPipelineResult?: any;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.exec.step.dispatched.v1',
      actor,
      stepData
    );

    this.emit('q.qflow.exec.step.dispatched.v1', event);
  }

  /**
   * Emit a step completed event
   */
  public async emitStepCompleted(
    actor: string,
    stepData: {
      executionId: string;
      stepId: string;
      nodeId: string;
      status: 'success' | 'failure' | 'timeout' | 'cancelled';
      result?: any;
      error?: any;
      executionMetrics?: any;
      qerberosStamp?: any;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.exec.step.completed.v1',
      actor,
      stepData
    );

    this.emit('q.qflow.exec.step.completed.v1', event);
  }

  /**
   * Emit an execution completed event
   */
  public async emitExecutionCompleted(
    actor: string,
    executionData: {
      executionId: string;
      flowId: string;
      status: 'completed' | 'failed' | 'aborted' | 'timeout';
      startTime: string;
      endTime: string;
      durationMs: number;
      completedSteps: string[];
      failedSteps: string[];
      finalResult?: any;
      error?: any;
      resourceUsage?: any;
      auditTrail?: any;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.exec.completed.v1',
      actor,
      executionData
    );

    this.emit('q.qflow.exec.completed.v1', event);
  }

  /**
   * Emit a validation pipeline executed event
   */
  public async emitValidationPipelineExecuted(
    actor: string,
    validationData: {
      validationId: string;
      operationType: 'flow-execution' | 'step-execution' | 'external-event' | 'flow-creation';
      operationId: string;
      inputHash: string;
      pipelineResult: any;
      cacheHit?: boolean;
      cacheKey?: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.validation.pipeline.executed.v1',
      actor,
      validationData
    );

    this.emit('q.qflow.validation.pipeline.executed.v1', event);
  }

  /**
   * Emit an external event received event
   */
  public async emitExternalEventReceived(
    actor: string,
    eventData: {
      externalEventId: string;
      sourceSystem: string;
      eventType: string;
      payload: any;
      signature?: string;
      validationResult: any;
      triggeredFlows?: Array<{ flowId: string; executionId: string }>;
      rateLimitInfo?: any;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.external.event.received.v1',
      actor,
      eventData
    );

    this.emit('q.qflow.external.event.received.v1', event);
  }

  /**
   * Emit a flow updated event
   */
  public async emitFlowUpdated(
    actor: string,
    flowData: {
      flowId: string;
      flowName: string;
      flowVersion: string;
      previousVersion: string;
      owner: string;
      daoSubnet?: string;
      metadata?: any;
      ipfsCid: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.updated.v1',
      actor,
      flowData
    );

    this.emit('q.qflow.flow.updated.v1', event);
  }

  /**
   * Emit a flow deleted event
   */
  public async emitFlowDeleted(
    actor: string,
    flowData: {
      flowId: string;
      flowName: string;
      flowVersion: string;
      owner: string;
      daoSubnet?: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.deleted.v1',
      actor,
      flowData
    );

    this.emit('q.qflow.flow.deleted.v1', event);
  }

  /**
   * Emit a flow ownership transferred event
   */
  public async emitFlowOwnershipTransferred(
    actor: string,
    ownershipData: {
      flowId: string;
      previousOwner: string;
      newOwner: string;
      transferredBy: string;
      reason?: string;
      timestamp: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.ownership.transferred.v1',
      actor,
      ownershipData
    );

    this.emit('q.qflow.flow.ownership.transferred.v1', event);
  }

  /**
   * Emit a flow access granted event
   */
  public async emitFlowAccessGranted(
    actor: string,
    accessData: {
      flowId: string;
      grantedTo: string;
      grantedBy: string;
      permissions: string[];
      grantedAt: string;
      expiresAt?: string;
      conditions?: Record<string, any>;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.access.granted.v1',
      actor,
      accessData
    );

    this.emit('q.qflow.flow.access.granted.v1', event);
  }

  /**
   * Emit a flow access revoked event
   */
  public async emitFlowAccessRevoked(
    actor: string,
    accessData: {
      flowId: string;
      revokedFrom: string;
      revokedBy: string;
      revokedAt: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.access.revoked.v1',
      actor,
      accessData
    );

    this.emit('q.qflow.flow.access.revoked.v1', event);
  }

  /**
   * Emit a flow sharing settings updated event
   */
  public async emitFlowSharingSettingsUpdated(
    actor: string,
    sharingData: {
      flowId: string;
      settings: any;
      setBy: string;
      setAt: string;
    }
  ): Promise<void> {
    const event = schemaRegistry.createEvent(
      'q.qflow.flow.sharing.updated.v1',
      actor,
      sharingData
    );

    this.emit('q.qflow.flow.sharing.updated.v1', event);
  }

  /**
   * Subscribe to Qflow events
   */
  public async subscribe(eventType: string, handler: (event: QflowEvent) => Promise<void>): Promise<void> {
    this.on(eventType, handler);
  }

  /**
   * Unsubscribe from Qflow events
   */
  public async unsubscribe(eventType: string, handler: (event: QflowEvent) => Promise<void>): Promise<void> {
    this.off(eventType, handler);
  }
}

// Singleton instance
export const qflowEventEmitter = new QflowEventEmitter();