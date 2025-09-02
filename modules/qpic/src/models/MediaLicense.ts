import mongoose, { Document, Schema } from 'mongoose';

export interface IMediaLicense extends Document {
  id: string;
  mediaId: string;
  type: 'exclusive' | 'non-exclusive' | 'royalty-free' | 'rights-managed' | 'creative-commons';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  
  licensor: string;
  licensee?: string;
  
  usage: ('commercial' | 'editorial' | 'personal' | 'educational' | 'non-profit')[];
  territory: string;
  duration: string;
  
  price?: {
    amount: number;
    currency: string;
  };
  
  restrictions: string[];
  
  attribution?: {
    required: boolean;
    text?: string;
  };
  
  terms: {
    transferable: boolean;
    sublicensable: boolean;
    exclusive: boolean;
    revocable: boolean;
  };
  
  contractCid?: string;
  marketplaceListingId?: string;
  
  transactions: {
    type: 'purchase' | 'renewal' | 'transfer' | 'revocation';
    amount?: number;
    currency?: string;
    from?: string;
    to?: string;
    timestamp: Date;
    transactionId?: string;
  }[];
  
  usage_tracking: {
    downloads: number;
    views: number;
    lastUsed?: Date;
    usageReports: {
      period: string;
      usage: Record<string, number>;
      reportedAt: Date;
    }[];
  };
  
  createdAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  updatedAt: Date;
}

const MediaLicenseSchema = new Schema({
  id: { type: String, required: true, unique: true },
  mediaId: { type: String, required: true },
  type: {
    type: String,
    enum: ['exclusive', 'non-exclusive', 'royalty-free', 'rights-managed', 'creative-commons'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'pending'],
    default: 'pending'
  },
  
  licensor: { type: String, required: true },
  licensee: String,
  
  usage: [{
    type: String,
    enum: ['commercial', 'editorial', 'personal', 'educational', 'non-profit']
  }],
  territory: { type: String, required: true },
  duration: { type: String, required: true },
  
  price: {
    amount: Number,
    currency: String
  },
  
  restrictions: [String],
  
  attribution: {
    required: { type: Boolean, default: false },
    text: String
  },
  
  terms: {
    transferable: { type: Boolean, default: false },
    sublicensable: { type: Boolean, default: false },
    exclusive: { type: Boolean, default: false },
    revocable: { type: Boolean, default: true }
  },
  
  contractCid: String,
  marketplaceListingId: String,
  
  transactions: [{
    type: {
      type: String,
      enum: ['purchase', 'renewal', 'transfer', 'revocation'],
      required: true
    },
    amount: Number,
    currency: String,
    from: String,
    to: String,
    timestamp: { type: Date, default: Date.now },
    transactionId: String
  }],
  
  usage_tracking: {
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    lastUsed: Date,
    usageReports: [{
      period: String,
      usage: Schema.Types.Mixed,
      reportedAt: { type: Date, default: Date.now }
    }]
  },
  
  expiresAt: Date,
  revokedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MediaLicenseSchema.index({ id: 1 });
MediaLicenseSchema.index({ mediaId: 1 });
MediaLicenseSchema.index({ licensor: 1 });
MediaLicenseSchema.index({ licensee: 1 });
MediaLicenseSchema.index({ status: 1 });
MediaLicenseSchema.index({ type: 1 });
MediaLicenseSchema.index({ expiresAt: 1 });
MediaLicenseSchema.index({ createdAt: -1 });

// Virtual for checking if license is expired
MediaLicenseSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware to update status based on expiration
MediaLicenseSchema.pre('save', function(next) {
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

export const MediaLicense = mongoose.model<IMediaLicense>('MediaLicense', MediaLicenseSchema);