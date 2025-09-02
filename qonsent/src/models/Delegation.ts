import { Schema, model, Document, Types } from 'mongoose';

export type DelegationStatus = 'active' | 'expired' | 'revoked';

export interface IDelegation extends Document {
  delegatorDid: string;
  delegateeDid: string;
  scope: string[];
  capabilities: string[];
  expiresAt?: Date;
  status: DelegationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DelegationSchema = new Schema<IDelegation>(
  {
    delegatorDid: {
      type: String,
      required: true,
      index: true,
    },
    delegateeDid: {
      type: String,
      required: true,
      index: true,
    },
    scope: {
      type: [String],
      required: true,
      default: [],
    },
    capabilities: {
      type: [String],
      required: true,
      default: [],
    },
    expiresAt: {
      type: Date,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
DelegationSchema.index(
  { delegatorDid: 1, delegateeDid: 1, status: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Index for verifying delegations
DelegationSchema.index(
  { delegatorDid: 1, delegateeDid: 1, scope: 1, status: 1, expiresAt: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Index for finding active delegations for a delegatee
DelegationSchema.index(
  { delegateeDid: 1, status: 1, expiresAt: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Index for finding active delegations by scope
DelegationSchema.index(
  { scope: 1, status: 1, expiresAt: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Add a TTL index for automatic cleanup of expired delegations
DelegationSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { 
      status: { $in: ['expired', 'revoked'] },
      expiresAt: { $exists: true }
    }
  }
);

// Middleware to update status based on expiration
DelegationSchema.pre<IDelegation & Document>('save', function(next) {
  if (this.isModified('expiresAt') && this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

export const Delegation = model<IDelegation>('Delegation', DelegationSchema);
