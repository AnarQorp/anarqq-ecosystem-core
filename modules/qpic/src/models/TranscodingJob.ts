import mongoose, { Document, Schema } from 'mongoose';

export interface ITranscodingProfile {
  name: string;
  format: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: string;
  bitrate?: string;
  options?: Record<string, any>;
}

export interface ITranscodingResult {
  profile: string;
  cid?: string;
  url?: string;
  size?: number;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ITranscodingJob extends Document {
  jobId: string;
  mediaId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  profiles: ITranscodingProfile[];
  results: ITranscodingResult[];
  
  requestedBy: string;
  workerId?: string;
  
  estimatedTime?: number;
  actualTime?: number;
  
  callback?: string;
  
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  
  retryCount: number;
  maxRetries: number;
  
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

const TranscodingProfileSchema = new Schema({
  name: { type: String, required: true },
  format: { type: String, required: true },
  quality: {
    type: String,
    enum: ['low', 'medium', 'high', 'ultra']
  },
  resolution: String,
  bitrate: String,
  options: Schema.Types.Mixed
}, { _id: false });

const TranscodingResultSchema = new Schema({
  profile: { type: String, required: true },
  cid: String,
  url: String,
  size: Number,
  duration: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: String,
  startedAt: Date,
  completedAt: Date
}, { _id: false });

const TranscodingJobSchema = new Schema({
  jobId: { type: String, required: true, unique: true },
  mediaId: { type: String, required: true },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  profiles: { type: [TranscodingProfileSchema], required: true },
  results: [TranscodingResultSchema],
  
  requestedBy: { type: String, required: true },
  workerId: String,
  
  estimatedTime: Number,
  actualTime: Number,
  
  callback: String,
  
  error: {
    code: String,
    message: String,
    details: Schema.Types.Mixed
  },
  
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
TranscodingJobSchema.index({ jobId: 1 });
TranscodingJobSchema.index({ mediaId: 1 });
TranscodingJobSchema.index({ status: 1 });
TranscodingJobSchema.index({ priority: 1, createdAt: 1 });
TranscodingJobSchema.index({ requestedBy: 1 });
TranscodingJobSchema.index({ workerId: 1 });
TranscodingJobSchema.index({ createdAt: -1 });

export const TranscodingJob = mongoose.model<ITranscodingJob>('TranscodingJob', TranscodingJobSchema);