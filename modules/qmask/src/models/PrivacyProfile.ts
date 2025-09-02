import mongoose, { Schema, Document } from 'mongoose';
import { MaskProfile, MaskRule } from '../types/privacy';

export interface IPrivacyProfile extends Document {
  name: string;
  rules: MaskRule[];
  defaults: Record<string, any>;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  description?: string;
  tags: string[];
  complianceFlags: string[];
}

const MaskRuleSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true
  },
  strategy: {
    type: String,
    required: true,
    enum: ['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE']
  },
  params: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const PrivacyProfileSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  rules: {
    type: [MaskRuleSchema],
    required: true,
    validate: {
      validator: function(rules: MaskRule[]) {
        return rules.length > 0;
      },
      message: 'At least one masking rule is required'
    }
  },
  defaults: {
    type: Schema.Types.Mixed,
    default: {}
  },
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  createdBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  tags: {
    type: [String],
    default: []
  },
  complianceFlags: {
    type: [String],
    default: [],
    enum: ['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PrivacyProfileSchema.index({ name: 1 });
PrivacyProfileSchema.index({ createdBy: 1 });
PrivacyProfileSchema.index({ tags: 1 });
PrivacyProfileSchema.index({ complianceFlags: 1 });
PrivacyProfileSchema.index({ isActive: 1 });

// Virtual for rule count
PrivacyProfileSchema.virtual('ruleCount').get(function() {
  return this.rules.length;
});

// Method to convert to MaskProfile format
PrivacyProfileSchema.methods.toMaskProfile = function(): MaskProfile {
  return {
    name: this.name,
    rules: this.rules,
    defaults: this.defaults,
    version: this.version
  };
};

export const PrivacyProfile = mongoose.model<IPrivacyProfile>('PrivacyProfile', PrivacyProfileSchema);