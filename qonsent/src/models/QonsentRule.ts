import { Schema, model, Document, Types } from 'mongoose';

export interface IQonsentRule extends Document {
  resourceId: string;
  ownerDid: string;
  targetDid: string;
  permissions: string[];
  expiresAt?: Date;
  daoScope?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QonsentRuleSchema = new Schema<IQonsentRule>(
  {
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    ownerDid: {
      type: String,
      required: true,
      index: true,
    },
    targetDid: {
      type: String,
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
    },
    expiresAt: {
      type: Date,
      index: true,
      sparse: true,
    },
    daoScope: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
QonsentRuleSchema.index(
  { resourceId: 1, ownerDid: 1, targetDid: 1, daoScope: 1 },
  { unique: true, partialFilterExpression: { daoScope: { $exists: false } } }
);

QonsentRuleSchema.index(
  { resourceId: 1, ownerDid: 1, targetDid: 1 },
  { unique: true, partialFilterExpression: { daoScope: { $exists: true } } }
);

// Index for viewable resources query
QonsentRuleSchema.index(
  { targetDid: 1, expiresAt: 1, resourceId: 1 },
  { partialFilterExpression: { expiresAt: { $exists: true } } }
);

// Add type for the document
interface IQonsentRuleDocument extends IQonsentRule, Document {}

// Export the interface and model
export { IQonsentRule };

export const QonsentRule = model<IQonsentRuleDocument>('QonsentRule', QonsentRuleSchema);
