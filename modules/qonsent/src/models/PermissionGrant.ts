import { Schema, model, Document } from 'mongoose';
import { PermissionGrant } from '../types';

export interface IPermissionGrantDocument extends Omit<PermissionGrant, '_id'>, Document {}

const PermissionGrantSchema = new Schema<IPermissionGrantDocument>(
  {
    grantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    identity: {
      type: String,
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      required: true,
      validate: {
        validator: function(permissions: string[]) {
          const validPermissions = ['read', 'write', 'delete', 'admin', 'share', 'execute'];
          return permissions.every(p => validPermissions.includes(p));
        },
        message: 'Invalid permission type',
      },
    },
    expiresAt: {
      type: Date,
      index: true,
      sparse: true,
    },
    conditions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    grantedBy: {
      type: String,
      required: true,
      index: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'permission_grants',
  }
);

// Compound indexes for efficient queries
PermissionGrantSchema.index({ resource: 1, identity: 1 }, { unique: true });
PermissionGrantSchema.index({ resource: 1, revoked: 1, expiresAt: 1 });
PermissionGrantSchema.index({ identity: 1, revoked: 1, expiresAt: 1 });
PermissionGrantSchema.index({ grantedBy: 1, createdAt: -1 });

// TTL index for expired grants
PermissionGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to update timestamps
PermissionGrantSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Instance methods
PermissionGrantSchema.methods.isExpired = function(): boolean {
  return this.expiresAt && this.expiresAt < new Date();
};

PermissionGrantSchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission) || this.permissions.includes('admin');
};

// Static methods
PermissionGrantSchema.statics.findActiveGrants = function(resource?: string, identity?: string) {
  const query: any = { 
    revoked: { $ne: true },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  };
  
  if (resource) query.resource = resource;
  if (identity) query.identity = identity;
  
  return this.find(query);
};

PermissionGrantSchema.statics.findByResourceAndIdentity = function(resource: string, identity: string) {
  return this.findOne({ resource, identity, revoked: { $ne: true } });
};

export const PermissionGrantModel = model<IPermissionGrantDocument>('PermissionGrant', PermissionGrantSchema);