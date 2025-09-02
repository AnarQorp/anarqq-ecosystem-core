import mongoose, { Document, Schema } from 'mongoose';

export interface IMediaMetadata {
  technical: {
    format: string;
    dimensions?: {
      width: number;
      height: number;
    };
    fileSize: number;
    duration?: number;
    bitrate?: number;
    colorSpace?: string;
    compression?: string;
    fps?: number;
    sampleRate?: number;
    channels?: number;
  };
  descriptive: {
    title?: string;
    description?: string;
    tags: string[];
    category?: string;
    keywords: string[];
    creator?: string;
    copyright?: string;
    language?: string;
  };
  rights: {
    license: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'CC-BY-NC' | 'CC-BY-ND' | 'CC-BY-NC-SA' | 'CC-BY-NC-ND' | 'PROPRIETARY';
    usage: ('commercial' | 'editorial' | 'personal' | 'educational' | 'non-profit')[];
    restrictions: string[];
    attribution?: {
      required: boolean;
      text?: string;
    };
  };
  provenance: {
    createdAt: Date;
    modifiedAt: Date;
    uploadedBy: string;
    originalFilename: string;
    source?: string;
    processingHistory: {
      operation: string;
      timestamp: Date;
      parameters?: Record<string, any>;
    }[];
  };
  extracted?: {
    exif?: Record<string, any>;
    id3?: Record<string, any>;
    xmp?: Record<string, any>;
    iptc?: Record<string, any>;
  };
}

export interface IMediaFormat {
  format: string;
  cid: string;
  url: string;
  size: number;
  quality?: string;
  resolution?: string;
  bitrate?: string;
  profile?: string;
  createdAt: Date;
}

export interface IMediaThumbnail {
  size: 'small' | 'medium' | 'large';
  cid: string;
  url: string;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  fileSize: number;
}

export interface IMediaPrivacy {
  profileApplied?: string;
  fieldsRedacted: string[];
  riskScore: number;
  appliedAt: Date;
  rules: {
    field: string;
    action: 'REDACT' | 'REMOVE' | 'HASH' | 'ENCRYPT';
    applied: boolean;
  }[];
}

export interface IMediaAccess {
  public: boolean;
  permissions: string[];
  downloadable: boolean;
  streamable: boolean;
  viewCount: number;
  downloadCount: number;
  lastAccessed?: Date;
}

export interface IMediaMarketplace {
  listed: boolean;
  licenseId?: string;
  price?: {
    amount: number;
    currency: string;
  };
  sales: {
    count: number;
    revenue: number;
    lastSale?: Date;
  };
  featured: boolean;
  rating?: {
    average: number;
    count: number;
  };
}

export interface IMediaFile extends Document {
  id: string;
  cid: string;
  filename: string;
  originalFilename: string;
  format: string;
  size: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
  uploadedBy: string;
  
  metadata: IMediaMetadata;
  thumbnails: IMediaThumbnail[];
  formats: IMediaFormat[];
  privacy?: IMediaPrivacy;
  access: IMediaAccess;
  marketplace?: IMediaMarketplace;
  
  // IPFS and storage
  ipfsHash: string;
  storageProvider: 'ipfs' | 'local' | 'cdn';
  backupCids: string[];
  
  // Processing
  processingJobs: string[];
  lastProcessed?: Date;
  
  // Audit trail
  auditLog: {
    action: string;
    actor: string;
    timestamp: Date;
    details?: Record<string, any>;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const MediaMetadataSchema = new Schema({
  technical: {
    format: { type: String, required: true },
    dimensions: {
      width: Number,
      height: Number
    },
    fileSize: { type: Number, required: true },
    duration: Number,
    bitrate: Number,
    colorSpace: String,
    compression: String,
    fps: Number,
    sampleRate: Number,
    channels: Number
  },
  descriptive: {
    title: String,
    description: String,
    tags: [String],
    category: String,
    keywords: [String],
    creator: String,
    copyright: String,
    language: String
  },
  rights: {
    license: {
      type: String,
      enum: ['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-ND', 'CC-BY-NC-SA', 'CC-BY-NC-ND', 'PROPRIETARY'],
      default: 'PROPRIETARY'
    },
    usage: [{
      type: String,
      enum: ['commercial', 'editorial', 'personal', 'educational', 'non-profit']
    }],
    restrictions: [String],
    attribution: {
      required: { type: Boolean, default: false },
      text: String
    }
  },
  provenance: {
    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    originalFilename: { type: String, required: true },
    source: String,
    processingHistory: [{
      operation: String,
      timestamp: { type: Date, default: Date.now },
      parameters: Schema.Types.Mixed
    }]
  },
  extracted: {
    exif: Schema.Types.Mixed,
    id3: Schema.Types.Mixed,
    xmp: Schema.Types.Mixed,
    iptc: Schema.Types.Mixed
  }
}, { _id: false });

const MediaFormatSchema = new Schema({
  format: { type: String, required: true },
  cid: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  quality: String,
  resolution: String,
  bitrate: String,
  profile: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const MediaThumbnailSchema = new Schema({
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    required: true
  },
  cid: { type: String, required: true },
  url: { type: String, required: true },
  dimensions: {
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  format: { type: String, required: true },
  fileSize: { type: Number, required: true }
}, { _id: false });

const MediaPrivacySchema = new Schema({
  profileApplied: String,
  fieldsRedacted: [String],
  riskScore: { type: Number, min: 0, max: 1, default: 0 },
  appliedAt: { type: Date, default: Date.now },
  rules: [{
    field: String,
    action: {
      type: String,
      enum: ['REDACT', 'REMOVE', 'HASH', 'ENCRYPT']
    },
    applied: Boolean
  }]
}, { _id: false });

const MediaAccessSchema = new Schema({
  public: { type: Boolean, default: false },
  permissions: [String],
  downloadable: { type: Boolean, default: true },
  streamable: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  lastAccessed: Date
}, { _id: false });

const MediaMarketplaceSchema = new Schema({
  listed: { type: Boolean, default: false },
  licenseId: String,
  price: {
    amount: Number,
    currency: String
  },
  sales: {
    count: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    lastSale: Date
  },
  featured: { type: Boolean, default: false },
  rating: {
    average: Number,
    count: { type: Number, default: 0 }
  }
}, { _id: false });

const MediaFileSchema = new Schema({
  id: { type: String, required: true, unique: true },
  cid: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  format: { type: String, required: true },
  size: { type: Number, required: true },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
    default: 'uploading'
  },
  uploadedBy: { type: String, required: true },
  
  metadata: { type: MediaMetadataSchema, required: true },
  thumbnails: [MediaThumbnailSchema],
  formats: [MediaFormatSchema],
  privacy: MediaPrivacySchema,
  access: { type: MediaAccessSchema, required: true },
  marketplace: MediaMarketplaceSchema,
  
  ipfsHash: { type: String, required: true },
  storageProvider: {
    type: String,
    enum: ['ipfs', 'local', 'cdn'],
    default: 'ipfs'
  },
  backupCids: [String],
  
  processingJobs: [String],
  lastProcessed: Date,
  
  auditLog: [{
    action: { type: String, required: true },
    actor: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MediaFileSchema.index({ id: 1 });
MediaFileSchema.index({ cid: 1 });
MediaFileSchema.index({ uploadedBy: 1 });
MediaFileSchema.index({ status: 1 });
MediaFileSchema.index({ 'metadata.descriptive.tags': 1 });
MediaFileSchema.index({ 'metadata.descriptive.category': 1 });
MediaFileSchema.index({ 'metadata.rights.license': 1 });
MediaFileSchema.index({ 'marketplace.listed': 1 });
MediaFileSchema.index({ createdAt: -1 });

// Text search index
MediaFileSchema.index({
  'metadata.descriptive.title': 'text',
  'metadata.descriptive.description': 'text',
  'metadata.descriptive.tags': 'text',
  'metadata.descriptive.keywords': 'text'
});

export const MediaFile = mongoose.model<IMediaFile>('MediaFile', MediaFileSchema);