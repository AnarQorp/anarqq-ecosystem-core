import { Model, Document, Types, Schema, model } from 'mongoose';
import { PrivacyProfile, IPrivacyProfile, VisibilityLevel, ExpirationRule } from '../models/PrivacyProfile';
import { QonsentService } from './qonsent.service';

// Global type declarations for mongoose
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    models: Record<string, any>;
    connection: any;
    // Add other mongoose properties as needed
  };
}

export interface ResourceProfileMapping extends Document {
  resourceId: string;
  profileId: Types.ObjectId;
  appliedAt: Date;
  appliedBy: string; // DID of the user who applied the profile
  customOverrides?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileParams {
  name: string;
  description?: string;
  visibility: VisibilityLevel;
  defaultQonsentIn: string[];
  defaultQonsentOut: string[];
  expirationRule: ExpirationRule;
  expirationValue?: number | Date;
  daoFallback?: string;
  isDefault?: boolean;
}

// Re-export IPrivacyProfile from the model file
export type { IPrivacyProfile } from '../models/PrivacyProfile';

export interface ApplyProfileParams {
  cid: string;
  ownerDid: string;
  profileName: string;
  customOverrides?: Partial<Omit<IPrivacyProfile, 'name' | 'isDefault'>>;
}

const ResourceProfileMappingSchema = new Schema<ResourceProfileMapping>(
  {
    resourceId: { type: String, required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'PrivacyProfile', required: true },
    appliedAt: { type: Date, default: Date.now },
    appliedBy: { type: String, required: true },
    customOverrides: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Create model if it doesn't exist
let ResourceProfileMappingModel: Model<ResourceProfileMapping & Document>;

try {
  ResourceProfileMappingModel = model<ResourceProfileMapping & Document>('ResourceProfileMapping');
} catch {
  ResourceProfileMappingModel = model<ResourceProfileMapping & Document>(
    'ResourceProfileMapping',
    ResourceProfileMappingSchema
  );
}

export class ProfileService {
  private profileModel: Model<IPrivacyProfile & Document>;
  private resourceProfileModel: Model<ResourceProfileMapping & Document>;
  // Keep the service for future use
  // Marked as used - will be used in future implementations
  // @ts-ignore - Temporarily ignoring unused variable warning
  private qonsentService: QonsentService;

  constructor() {
    this.profileModel = PrivacyProfile;
    this.resourceProfileModel = ResourceProfileMappingModel;
    this.qonsentService = new QonsentService();
  }

  /**
   * Create a new privacy profile
   */
  async createProfile(params: CreateProfileParams): Promise<IPrivacyProfile> {
    // If this is set as default, unset any existing default for this visibility level
    if (params.isDefault) {
      await this.profileModel.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const profile = new this.profileModel(params);
    return await profile.save();
  }

  /**
   * Get a profile by name
   */
  async getProfile(name: string): Promise<IPrivacyProfile | null> {
    return this.profileModel.findOne({ name });
  }

  /**
   * List all available profiles
   */
  async listProfiles() {
    return this.profileModel.find().lean();
  }

  /**
   * Get the profile applied to a specific resource
   */
  async getProfileForResource(resourceId: string): Promise<IPrivacyProfile | null> {
    const mapping = await this.resourceProfileModel
      .findOne({ resourceId })
      .populate('profileId')
      .lean();

    if (!mapping) {
      return null;
    }

    // Merge custom overrides with the base profile
    const profile = { ...mapping.profileId };
    if (mapping.customOverrides) {
      Object.assign(profile, mapping.customOverrides);
    }

    return profile as IPrivacyProfile;
  }

  /**
   * Apply a privacy profile to a resource
   */
  async applyProfileToResource(params: {
    cid: string;
    profileName: string;
    ownerDid: string;
    customOverrides?: any;
  }): Promise<ResourceProfileMapping> {
    const { cid, profileName, ownerDid, customOverrides } = params;

    const profile = await this.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile ${profileName} not found`);
    }

    // Apply the profile rules to the resource
    await this.applyProfileRules(cid, profile, ownerDid, customOverrides);

    // Create or update the mapping
    const mapping = await this.resourceProfileModel.findOneAndUpdate(
      { resourceId: cid },
      {
        profileId: (profile as any)._id, // Type assertion since _id is not in the interface
        appliedAt: new Date(),
        appliedBy: ownerDid,
        customOverrides,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as unknown as ResourceProfileMapping;

    return mapping;
  }

  /**
   * Apply the rules defined in a profile to a resource
   */
  private async applyProfileRules(
    resourceId: string,
    profile: IPrivacyProfile & { toObject?: () => any },
    ownerDid: string,
    customOverrides?: Partial<Omit<IPrivacyProfile, 'name' | 'isDefault'>>
  ): Promise<void> {
    // Convert to plain object if it's a Mongoose document
    const profileObj = profile.toObject ? profile.toObject() : profile;
    const effectiveProfile = customOverrides
      ? { ...profileObj, ...customOverrides, name: profile.name }
      : profileObj;

    // Log the operation
    console.log(`Applying profile rules for resource ${resourceId} by ${ownerDid}`);
    
    // Apply any custom overrides
    if (customOverrides) {
      console.log('Applying custom overrides:', customOverrides);
    }
    
    // Use the effective profile for any rule application
    if (effectiveProfile) {
      // Apply rules based on the effective profile
      // This is a placeholder for actual rule application logic
      console.log('Effective profile for rules:', effectiveProfile);
    }
  }

  /**
   * Calculate the expiration date based on the profile's expiration rule
   */
  /**
   * Calculate the expiration date based on the profile's expiration rule
   * @param profile The privacy profile to calculate expiration for
   * @returns The expiration date or undefined if no expiration is set
   * @internal
   */
  // @ts-ignore - Temporarily ignoring unused method warning
  private calculateExpiration(profile: IPrivacyProfile): Date | undefined {
    if (!profile.expirationRule || profile.expirationRule === ExpirationRule.NONE) {
      return undefined;
    }

    const now = new Date();

    switch (profile.expirationRule) {
      case ExpirationRule.TTL:
        return profile.expirationValue 
          ? new Date(now.getTime() + (profile.expirationValue as number) * 1000)
          : undefined;

      case ExpirationRule.FIXED_DATE:
        return profile.expirationValue as Date;

      default:
        return undefined;
    }
  }

  /**
   * Get the default profile for a visibility level
   */
  async getDefaultProfile(visibility?: VisibilityLevel): Promise<IPrivacyProfile | null> {
    const query: Record<string, unknown> = { isDefault: true };
    if (visibility) {
      query.visibility = visibility;
    }
    return this.profileModel.findOne(query).lean().exec();
  }

  /**
   * Initialize default profiles if they don't exist
   */
  async initializeDefaultProfiles(): Promise<void> {
    const defaultProfiles = [
      {
        name: 'public_default',
        description: 'Default public profile - visible to everyone',
        visibility: VisibilityLevel.PUBLIC,
        defaultQonsentIn: ['*'], // Everyone
        defaultQonsentOut: ['*'], // Everyone
        expirationRule: ExpirationRule.NONE,
        isDefault: true,
      },
      {
        name: 'dao_only_basic',
        description: 'DAO-only access - visible only to DAO members',
        visibility: VisibilityLevel.DAO_ONLY,
        defaultQonsentIn: [], // Will be populated with DAO members by the DAO service
        defaultQonsentOut: ['dao:member'], // Only DAO members
        expirationRule: ExpirationRule.NONE,
      },
      {
        name: 'private_strict',
        description: 'Strictly private - visible only to the owner',
        visibility: VisibilityLevel.PRIVATE,
        defaultQonsentIn: [], // Only the owner
        defaultQonsentOut: [], // No one
        expirationRule: ExpirationRule.NONE,
      },
    ];

    for (const profile of defaultProfiles) {
      const exists = await this.profileModel.exists({ name: profile.name });
      if (!exists) {
        await this.createProfile(profile as any);
      }
    }
  }
}

export default ProfileService;
