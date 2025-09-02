/**
 * Mask Rule - Individual privacy masking rule
 */
export interface MaskRule {
  /** Field path to apply the rule to */
  field: string;
  /** Masking strategy to apply */
  strategy: 'REDACT' | 'HASH' | 'ENCRYPT' | 'ANONYMIZE' | 'REMOVE';
  /** Additional parameters for the strategy */
  params?: Record<string, any>;
}

/**
 * Mask Profile - Privacy profile for data anonymization
 */
export interface MaskProfile {
  /** Profile name */
  name: string;
  /** List of masking rules */
  rules: MaskRule[];
  /** Default values for masked fields */
  defaults: Record<string, any>;
  /** Profile version */
  version: string;
}

/**
 * Validates a MaskRule object
 */
export function isValidMaskRule(rule: any): rule is MaskRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    typeof rule.field === 'string' &&
    rule.field.length > 0 &&
    ['REDACT', 'HASH', 'ENCRYPT', 'ANONYMIZE', 'REMOVE'].includes(rule.strategy) &&
    (rule.params === undefined || (typeof rule.params === 'object' && rule.params !== null))
  );
}

/**
 * Validates a MaskProfile object
 */
export function isValidMaskProfile(profile: any): profile is MaskProfile {
  return (
    typeof profile === 'object' &&
    profile !== null &&
    typeof profile.name === 'string' &&
    profile.name.length > 0 &&
    Array.isArray(profile.rules) &&
    profile.rules.every(isValidMaskRule) &&
    typeof profile.defaults === 'object' &&
    profile.defaults !== null &&
    typeof profile.version === 'string' &&
    profile.version.length > 0
  );
}