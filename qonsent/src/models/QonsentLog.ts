import { Schema, model, Document, Types } from 'mongoose';

export type QonsentActionType = 
  | 'set_qonsent'
  | 'revoke_qonsent'
  | 'update_qonsent'
  | 'set_policy'
  | 'revoke_policy'
  | 'update_policy'
  | 'delete_policy';

export interface IQonsentLog extends Document {
  timestamp: Date;
  actorDid: string;
  action: QonsentActionType;
  resourceId?: string;
  targetDid?: string;
  daoScope?: string;
  metadata: Record<string, any>;
}

const QonsentLogSchema = new Schema<IQonsentLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    actorDid: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'set_qonsent',
        'revoke_qonsent',
        'update_qonsent',
        'batch_sync',
        'delegate',
        'revoke_delegation',
        'create_policy',
        'update_policy',
        'delete_policy',
      ],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
      sparse: true,
    },
    targetDid: {
      type: String,
      index: true,
      sparse: true,
    },
    daoScope: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Disable the _id field since we're using timestamp as the primary key
    _id: false,
    // Enable automatic creation of timestamps
    timestamps: false,
    // Enable versioning for optimistic concurrency control
    optimisticConcurrency: true,
  }
);

// Compound indexes for common query patterns
QonsentLogSchema.index({ actorDid: 1, timestamp: -1 });
QonsentLogSchema.index({ targetDid: 1, timestamp: -1 });
QonsentLogSchema.index({ daoScope: 1, timestamp: -1 });
QonsentLogSchema.index({ resourceId: 1, timestamp: -1 });
QonsentLogSchema.index({ action: 1, timestamp: -1 });

// TTL index for automatic cleanup of old logs (retain logs for 1 year)
QonsentLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 } // 1 year in seconds
);

// Add type for the document
interface IQonsentLogDocument extends IQonsentLog, Document {}

// Pre-save hook to ensure timestamp is always set
QonsentLogSchema.pre<IQonsentLogDocument>('save', function(next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});

// Export the model
export const QonsentLog = model<IQonsentLogDocument>('QonsentLog', QonsentLogSchema);
