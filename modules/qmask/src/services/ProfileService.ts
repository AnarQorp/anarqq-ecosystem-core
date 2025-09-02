import { MaskProfile } from '../types/privacy';
import { PrivacyProfile, IPrivacyProfile } from '../models/PrivacyProfile';
import { logger } from '../utils/logger';

export class ProfileService {
  /**
   * Create a new privacy profile
   */
  async createProfile(
    profileData: MaskProfile,
    createdBy: string,
    options?: {
      description?: string;
      tags?: string[];
      complianceFlags?: string[];
    }
  ): Promise<IPrivacyProfile> {
    logger.info(`Creating privacy profile: ${profileData.name}`);

    // Check if profile already exists
    const existingProfile = await PrivacyProfile.findOne({ name: profileData.name });
    if (existingProfile) {
      throw new Error(`Profile with name '${profileData.name}' already exists`);
    }

    // Validate profile data
    this.validateProfile(profileData);

    const profile = new PrivacyProfile({
      name: profileData.name,
      rules: profileData.rules,
      defaults: profileData.defaults,
      version: profileData.version,
      createdBy,
      description: options?.description,
      tags: options?.tags || [],
      complianceFlags: options?.complianceFlags || []
    });

    return await profile.save();
  }

  /**
   * Get a privacy profile by name
   */
  async getProfile(name: string): Promise<IPrivacyProfile | null> {
    return await PrivacyProfile.findOne({ name, isActive: true });
  }

  /**
   * Update an existing privacy profile
   */
  async updateProfile(
    name: string,
    updates: Partial<MaskProfile>,
    updatedBy: string
  ): Promise<IPrivacyProfile | null> {
    logger.info(`Updating privacy profile: ${name}`);

    const profile = await PrivacyProfile.findOne({ name, isActive: true });
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    // Check permissions (only creator can update)
    if (profile.createdBy !== updatedBy) {
      throw new Error('Only the profile creator can update it');
    }

    // Validate updates
    if (updates.rules) {
      this.validateRules(updates.rules);
    }

    // Update fields
    if (updates.rules) profile.rules = updates.rules;
    if (updates.defaults) profile.defaults = updates.defaults;
    if (updates.version) profile.version = updates.version;

    return await profile.save();
  }

  /**
   * Delete a privacy profile
   */
  async deleteProfile(name: string, deletedBy: string): Promise<boolean> {
    logger.info(`Deleting privacy profile: ${name}`);

    const profile = await PrivacyProfile.findOne({ name, isActive: true });
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    // Check permissions (only creator can delete)
    if (profile.createdBy !== deletedBy) {
      throw new Error('Only the profile creator can delete it');
    }

    // Soft delete by setting isActive to false
    profile.isActive = false;
    await profile.save();

    return true;
  }

  /**
   * List privacy profiles
   */
  async listProfiles(
    filters?: {
      createdBy?: string;
      tags?: string[];
      complianceFlags?: string[];
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    profiles: IPrivacyProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { isActive: true };

    // Apply filters
    if (filters?.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.complianceFlags && filters.complianceFlags.length > 0) {
      query.complianceFlags = { $in: filters.complianceFlags };
    }

    // Pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      PrivacyProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PrivacyProfile.countDocuments(query)
    ]);

    return {
      profiles,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get profile statistics
   */
  async getProfileStats(name: string): Promise<{
    usageCount: number;
    lastUsed?: Date;
    averageRiskScore: number;
    complianceFlags: string[];
  }> {
    const profile = await PrivacyProfile.findOne({ name, isActive: true });
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    // TODO: Implement usage tracking
    // For now, return mock data
    return {
      usageCount: 0,
      averageRiskScore: 0.3,
      complianceFlags: profile.complianceFlags
    };
  }

  /**
   * Create default privacy profiles
   */
  async createDefaultProfiles(createdBy: string): Promise<IPrivacyProfile[]> {
    const defaultProfiles = [
      {
        name: 'gdpr-basic',
        description: 'Basic GDPR compliance profile',
        rules: [
          {
            field: 'email',
            strategy: 'HASH' as const,
            params: { algorithm: 'sha256', salt: 'gdpr-salt' }
          },
          {
            field: 'name',
            strategy: 'REDACT' as const,
            params: { replacement: '[REDACTED]' }
          },
          {
            field: 'phone',
            strategy: 'REDACT' as const,
            params: { preserveFormat: true }
          },
          {
            field: 'address',
            strategy: 'ANONYMIZE' as const,
            params: { technique: 'generalization' }
          }
        ],
        defaults: { redactedValue: '[REDACTED]' },
        version: '1.0.0',
        tags: ['gdpr', 'basic', 'compliance'],
        complianceFlags: ['GDPR']
      },
      {
        name: 'hipaa-medical',
        description: 'HIPAA compliance profile for medical data',
        rules: [
          {
            field: 'ssn',
            strategy: 'REMOVE' as const
          },
          {
            field: 'medical_record_number',
            strategy: 'HASH' as const,
            params: { algorithm: 'sha256' }
          },
          {
            field: 'diagnosis',
            strategy: 'ENCRYPT' as const
          },
          {
            field: 'birth_date',
            strategy: 'ANONYMIZE' as const,
            params: { technique: 'generalization' }
          }
        ],
        defaults: {},
        version: '1.0.0',
        tags: ['hipaa', 'medical', 'healthcare'],
        complianceFlags: ['HIPAA']
      },
      {
        name: 'pci-payment',
        description: 'PCI DSS compliance profile for payment data',
        rules: [
          {
            field: 'credit_card_number',
            strategy: 'REDACT' as const,
            params: { preserveFormat: true, showLast: 4 }
          },
          {
            field: 'cvv',
            strategy: 'REMOVE' as const
          },
          {
            field: 'expiry_date',
            strategy: 'REDACT' as const
          },
          {
            field: 'cardholder_name',
            strategy: 'HASH' as const
          }
        ],
        defaults: {},
        version: '1.0.0',
        tags: ['pci', 'payment', 'financial'],
        complianceFlags: ['PCI_DSS']
      },
      {
        name: 'high-anonymization',
        description: 'High-strength anonymization profile',
        rules: [
          {
            field: 'name',
            strategy: 'REMOVE' as const
          },
          {
            field: 'email',
            strategy: 'REMOVE' as const
          },
          {
            field: 'phone',
            strategy: 'REMOVE' as const
          },
          {
            field: 'address',
            strategy: 'ANONYMIZE' as const,
            params: { technique: 'suppression' }
          },
          {
            field: 'age',
            strategy: 'ANONYMIZE' as const,
            params: { technique: 'generalization', range: 10 }
          }
        ],
        defaults: {},
        version: '1.0.0',
        tags: ['high-security', 'anonymization', 'research'],
        complianceFlags: ['GDPR', 'CCPA']
      }
    ];

    const createdProfiles: IPrivacyProfile[] = [];

    for (const profileData of defaultProfiles) {
      try {
        // Check if profile already exists
        const existing = await PrivacyProfile.findOne({ name: profileData.name });
        if (!existing) {
          const profile = await this.createProfile(
            {
              name: profileData.name,
              rules: profileData.rules,
              defaults: profileData.defaults,
              version: profileData.version
            },
            createdBy,
            {
              description: profileData.description,
              tags: profileData.tags,
              complianceFlags: profileData.complianceFlags
            }
          );
          createdProfiles.push(profile);
          logger.info(`Created default profile: ${profileData.name}`);
        }
      } catch (error) {
        logger.error(`Failed to create default profile ${profileData.name}:`, error);
      }
    }

    return createdProfiles;
  }

  /**
   * Validate a privacy profile
   */
  private validateProfile(profile: MaskProfile): void {
    if (!profile.name || profile.name.trim().length === 0) {
      throw new Error('Profile name is required');
    }

    if (!profile.version || profile.version.trim().length === 0) {
      throw new Error('Profile version is required');
    }

    if (!profile.rules || profile.rules.length === 0) {
      throw new Error('At least one masking rule is required');
    }

    this.validateRules(profile.rules);
  }

  /**
   * Validate masking rules
   */
  private validateRules(rules: any[]): void {
    const validStrategies = ['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE'];

    for (const rule of rules) {
      if (!rule.field || typeof rule.field !== 'string') {
        throw new Error('Rule field is required and must be a string');
      }

      if (!rule.strategy || !validStrategies.includes(rule.strategy)) {
        throw new Error(`Rule strategy must be one of: ${validStrategies.join(', ')}`);
      }

      if (rule.params && typeof rule.params !== 'object') {
        throw new Error('Rule params must be an object');
      }
    }
  }

  /**
   * Clone a privacy profile with a new name
   */
  async cloneProfile(
    sourceName: string,
    newName: string,
    clonedBy: string,
    options?: {
      description?: string;
      tags?: string[];
    }
  ): Promise<IPrivacyProfile> {
    const sourceProfile = await this.getProfile(sourceName);
    if (!sourceProfile) {
      throw new Error(`Source profile '${sourceName}' not found`);
    }

    const clonedProfile: MaskProfile = {
      name: newName,
      rules: [...sourceProfile.rules],
      defaults: { ...sourceProfile.defaults },
      version: '1.0.0' // Reset version for cloned profile
    };

    return await this.createProfile(clonedProfile, clonedBy, {
      description: options?.description || `Cloned from ${sourceName}`,
      tags: options?.tags || [...sourceProfile.tags, 'cloned'],
      complianceFlags: [...sourceProfile.complianceFlags]
    });
  }
}