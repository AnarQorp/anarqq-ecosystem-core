import { Schema, model, Document, Types } from 'mongoose';

export interface IDAOVisibilityPolicy extends Document {
  daoId: string;
  resourcePattern: string;
  allowedRoles: string[];
  restrictions: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DAOVisibilityPolicySchema = new Schema<IDAOVisibilityPolicy>(
  {
    daoId: {
      type: String,
      required: true,
      index: true,
    },
    resourcePattern: {
      type: String,
      required: true,
      index: true,
    },
    allowedRoles: {
      type: [String],
      required: true,
      default: [],
    },
    restrictions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique resource patterns per DAO
DAOVisibilityPolicySchema.index(
  { daoId: 1, resourcePattern: 1 },
  { unique: true }
);

// Text index for searching resource patterns
DAOVisibilityPolicySchema.index(
  { resourcePattern: 'text' },
  { default_language: 'none' }
);

export const DAOVisibilityPolicy = model<IDAOVisibilityPolicy>(
  'DAOVisibilityPolicy',
  DAOVisibilityPolicySchema
);
