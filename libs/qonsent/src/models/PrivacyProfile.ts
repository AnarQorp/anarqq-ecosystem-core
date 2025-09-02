import { Schema, model, Document, Types } from 'mongoose';

export enum VisibilityLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DAO_ONLY = 'dao_only',
  DELEGATED = 'delegated',
  TIME_LIMITED = 'time_limited'
}

export enum ExpirationRule {
  NONE = 'none',
  TTL = 'ttl',
  UNTIL_READ = 'until_read',
  FIXED_DATE = 'fixed_date'
}

export interface IPrivacyProfile extends Document {
  name: string;
  description?: string;
  visibility: VisibilityLevel;
  defaultQonsentIn: string[];
  defaultQonsentOut: string[];
  expirationRule: ExpirationRule;
  expirationValue?: number | Date; // TTL in seconds or fixed date
  daoFallback?: string; // DID of the DAO for fallback permissions
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PrivacyProfileSchema = new Schema<IPrivacyProfile>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    visibility: {
      type: String,
      enum: Object.values(VisibilityLevel),
      required: true,
    },
    defaultQonsentIn: {
      type: [String],
      required: true,
      default: [],
    },
    defaultQonsentOut: {
      type: [String],
      required: true,
      default: [],
    },
    expirationRule: {
      type: String,
      enum: Object.values(ExpirationRule),
      required: true,
      default: ExpirationRule.NONE,
    },
    expirationValue: {
      type: Schema.Types.Mixed,
      required: false,
    },
    daoFallback: {
      type: String,
      required: false,
      index: true,
      sparse: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one default profile per visibility level
PrivacyProfileSchema.index(
  { isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  }
);

export const PrivacyProfile = model<IPrivacyProfile>('PrivacyProfile', PrivacyProfileSchema);

export default PrivacyProfile;
