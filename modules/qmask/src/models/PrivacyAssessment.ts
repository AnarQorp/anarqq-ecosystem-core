import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivacyRisk {
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string;
}

export interface IPrivacyAssessment extends Document {
  assessmentId: string;
  operation: {
    type: string;
    dataTypes: string[];
    purpose: string;
    recipients: string[];
    retention: string;
    jurisdiction: string;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  risks: IPrivacyRisk[];
  recommendations: string[];
  complianceRequirements: string[];
  assessedBy: string;
  assessedAt: Date;
  validUntil: Date;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

const PrivacyRiskSchema = new Schema({
  category: {
    type: String,
    required: true,
    enum: ['DATA_BREACH', 'RE_IDENTIFICATION', 'UNAUTHORIZED_ACCESS', 'DATA_MISUSE', 'COMPLIANCE_VIOLATION']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  mitigation: {
    type: String,
    required: true,
    maxlength: 500
  }
}, { _id: false });

const OperationSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['COLLECTION', 'PROCESSING', 'STORAGE', 'SHARING', 'DELETION', 'ANALYSIS']
  },
  dataTypes: {
    type: [String],
    required: true,
    validate: {
      validator: function(types: string[]) {
        return types.length > 0;
      },
      message: 'At least one data type is required'
    }
  },
  purpose: {
    type: String,
    required: true,
    maxlength: 200
  },
  recipients: {
    type: [String],
    default: []
  },
  retention: {
    type: String,
    required: true
  },
  jurisdiction: {
    type: String,
    required: true
  }
}, { _id: false });

const PrivacyAssessmentSchema = new Schema({
  assessmentId: {
    type: String,
    required: true,
    unique: true
  },
  operation: {
    type: OperationSchema,
    required: true
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  risks: {
    type: [PrivacyRiskSchema],
    default: []
  },
  recommendations: {
    type: [String],
    default: []
  },
  complianceRequirements: {
    type: [String],
    default: [],
    enum: ['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS', 'PIPEDA', 'LGPD']
  },
  assessedBy: {
    type: String,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: 'DRAFT',
    enum: ['DRAFT', 'APPROVED', 'REJECTED', 'EXPIRED']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PrivacyAssessmentSchema.index({ assessmentId: 1 });
PrivacyAssessmentSchema.index({ assessedBy: 1 });
PrivacyAssessmentSchema.index({ riskLevel: 1 });
PrivacyAssessmentSchema.index({ status: 1 });
PrivacyAssessmentSchema.index({ validUntil: 1 });
PrivacyAssessmentSchema.index({ 'operation.type': 1 });

// Virtual for days until expiry
PrivacyAssessmentSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.validUntil.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if assessment is expired
PrivacyAssessmentSchema.methods.isExpired = function(): boolean {
  return new Date() > this.validUntil;
};

export const PrivacyAssessment = mongoose.model<IPrivacyAssessment>('PrivacyAssessment', PrivacyAssessmentSchema);