import { Model, Document, Types, Schema, model } from 'mongoose';
import { PrivacyProfile, IPrivacyProfile, VisibilityLevel, ExpirationRule } from '../models/PrivacyProfile';
import { QonsentService } from './qonsent.service';

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

    // Find the profile
    const profile = await this.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    // Create or update the mapping
    const mapping = await this.resourceProfileModel.findOneAndUpdate(
      { resourceId: cid },
      {
        profileId: profile._id,
        appliedBy: ownerDid,
        appliedAt: new Date(),
        customOverrides,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Apply the profile rules to the resource
    await this.applyProfileRules(cid, profile, ownerDid, customOverrides);

    return mapping;
  }

  /**
   * Apply the rules defined in a profile to a resource
   */
  private async applyProfileRules(
    resourceId: string,
    profile: IPrivacyProfile,
    ownerDid: string,
    customOverrides?: any
  ): Promise<void> {
    // Apply default qonsent_in rules
    if (profile.defaultQonsentIn && profile.defaultQonsentIn.length > 0) {
      await this.qonsentService.setConsent({
        resourceId,
        ownerDid,
        targetDid: ownerDid, // Self-permission
        permissions: profile.defaultQonsentIn,
        daoScope: profile.visibility === 'dao_only' ? profile.daoFallback : undefined,
        expiresAt: this.calculateExpiration(profile),
      });
    }

    // Apply any custom overrides
    if (customOverrides) {
      // Implementation depends on the structure of customOverrides
      // This is a placeholder for custom rule application logic
    }
  }

  /**
   * Calculate the expiration date based on the profile's expiration rule
   */
  private calculateExpiration(profile: IPrivacyProfile): Date | undefined {
    if (!profile.expirationRule || profile.expirationRule === 'none') {
      return undefined;
    }

    const now = new Date();
    
    switch (profile.expirationRule) {
      case 'ttl':
        return new Date(now.getTime() + (profile.expirationValue as number) * 1000);
      
      case 'fixed_date':
        return profile.expirationValue as Date;
      
      default:
        return undefined;
    }
  }

  /**
   * Get the default profile for a visibility level
   */
  async getDefaultProfile(visibility: VisibilityLevel): Promise<IPrivacyProfile | null> {
    return this.profileModel.findOne({ isDefault: true, visibility }).lean();
  }

  /**
   * Initialize default privacy profiles if they don't exist
   */
  async initializeDefaultProfiles(): Promise<void> {
    const defaultProfiles = [
      {
        name: 'public_default',
        description: 'Default public profile - visible to everyone',
        visibility: VisibilityLevel.PUBLIC,
        defaultQonsentIn: ['read', 'view'],
        defaultQonsentOut: [],
        expirationRule: ExpirationRule.NONE,
        isDefault: true,
      },
      {
        name: 'dao_only_basic',
        description: 'DAO-only access - visible only to DAO members',
        visibility: VisibilityLevel.DAO_ONLY,
        defaultQonsentIn: ['read', 'view'],
        defaultQonsentOut: [],
        expirationRule: ExpirationRule.NONE,
        isDefault: true,
      },
      {
        name: 'private_strict',
        description: 'Strictly private - visible only to the owner',
        visibility: VisibilityLevel.PRIVATE,
        defaultQonsentIn: ['read', 'write', 'delete'],
        defaultQonsentOut: [],
        expirationRule: ExpirationRule.NONE,
        isDefault: true,
      },
    ];

    for (const profile of defaultProfiles) {
      await this.profileModel.findOneAndUpdate(
        { name: profile.name },
        { $setOnInsert: profile },
        { upsert: true, new: true }
      );
    }
  }
    const profile = await this.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    // Apply custom overrides if provided
    const effectiveProfile = customOverrides 
      ? { ...profile.toObject(), ...customOverrides, name: profile.name }
      : profile;

    // Apply the profile rules as consent rules
    // This is a simplified example - in reality, you'd map the profile to specific consent rules
    const rules = [];
    
    // Apply qonsent_in rules (who can access)
    for (const targetDid of effectiveProfile.defaultQonsentIn) {
      const rule = await this.consentService.setConsent({
        resourceId: cid,
        ownerDid,
        targetDid,
        permissions: ['read'], // Default permission for qonsent_in
        ...(effectiveProfile.expirationRule === ExpirationRule.FIXED_DATE && effectiveProfile.expirationValue
          ? { expiresAt: new Date(effectiveProfile.expirationValue) }
          : {}),
        ...(effectiveProfile.daoFallback ? { daoScope: effectiveProfile.daoFallback } : {}),
      });
      rules.push(rule);
    }

    // TODO: Apply qonsent_out rules (visibility settings)
    // This would depend on how visibility is implemented in your system

    return {
      success: true,
      rulesApplied: rules.length,
      profile: effectiveProfile,
    };
  }

  /**
   * Get the default profile for a visibility level
   */
  async getDefaultProfile(visibility?: VisibilityLevel): Promise<IPrivacyProfile | null> {
    const query: any = { isDefault: true };
    if (visibility) {
      query.visibility = visibility;
    }
    return this.profileModel.findOne(query);
  }

  /**
   * Initialize default profiles if they don't exist
   */
  async initializeDefaultProfiles() {
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
