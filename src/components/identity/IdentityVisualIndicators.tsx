/**
 * Identity Visual Indicators and Badges
 * Create identity type icons, privacy level badges, and security status indicators
 * Requirements: 1.2, 1.5, 3.3
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Crown,
  Users,
  Building2,
  Shield,
  EyeOff,
  User,
  Globe,
  Lock,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Verified,
  UserCheck,
  UserX,
  Key,
  Fingerprint,
  Activity
} from 'lucide-react';
import { 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType,
  ExtendedSquidIdentity,
  SecurityFlag
} from '@/types/identity';
import { cn } from '@/lib/utils';

// Identity Type Icon Component
interface IdentityTypeIconProps {
  type: IdentityType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IdentityTypeIcon: React.FC<IdentityTypeIconProps> = ({ 
  type, 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getIcon = () => {
    switch (type) {
      case IdentityType.ROOT:
        return <Crown className={cn(sizeClasses[size], 'text-yellow-600', className)} />;
      case IdentityType.DAO:
        return <Users className={cn(sizeClasses[size], 'text-blue-600', className)} />;
      case IdentityType.ENTERPRISE:
        return <Building2 className={cn(sizeClasses[size], 'text-purple-600', className)} />;
      case IdentityType.CONSENTIDA:
        return <Shield className={cn(sizeClasses[size], 'text-green-600', className)} />;
      case IdentityType.AID:
        return <EyeOff className={cn(sizeClasses[size], 'text-gray-600', className)} />;
      default:
        return <User className={cn(sizeClasses[size], 'text-gray-500', className)} />;
    }
  };

  return getIcon();
};

// Identity Type Badge Component
interface IdentityTypeBadgeProps {
  type: IdentityType;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const IdentityTypeBadge: React.FC<IdentityTypeBadgeProps> = ({
  type,
  variant = 'default',
  size = 'md',
  showIcon = true,
  className
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case IdentityType.ROOT:
        return {
          label: 'Root',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Crown
        };
      case IdentityType.DAO:
        return {
          label: 'DAO',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Users
        };
      case IdentityType.ENTERPRISE:
        return {
          label: 'Enterprise',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Building2
        };
      case IdentityType.CONSENTIDA:
        return {
          label: 'Consentida',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Shield
        };
      case IdentityType.AID:
        return {
          label: 'Anonymous',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: EyeOff
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: User
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'outline' && config.color,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

// Privacy Level Badge Component
interface PrivacyLevelBadgeProps {
  level: PrivacyLevel;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const PrivacyLevelBadge: React.FC<PrivacyLevelBadgeProps> = ({
  level,
  variant = 'outline',
  size = 'md',
  showIcon = true,
  className
}) => {
  const getPrivacyConfig = () => {
    switch (level) {
      case PrivacyLevel.PUBLIC:
        return {
          label: 'Public',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Globe
        };
      case PrivacyLevel.DAO_ONLY:
        return {
          label: 'DAO Only',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Users
        };
      case PrivacyLevel.PRIVATE:
        return {
          label: 'Private',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Lock
        };
      case PrivacyLevel.ANONYMOUS:
        return {
          label: 'Anonymous',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: EyeOff
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Eye
        };
    }
  };

  const config = getPrivacyConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'outline' && config.color,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

// Identity Status Indicator Component
interface IdentityStatusIndicatorProps {
  status: IdentityStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const IdentityStatusIndicator: React.FC<IdentityStatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
  className
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getStatusConfig = () => {
    switch (status) {
      case IdentityStatus.ACTIVE:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          label: 'Active'
        };
      case IdentityStatus.INACTIVE:
        return {
          icon: XCircle,
          color: 'text-red-600',
          label: 'Inactive'
        };
      case IdentityStatus.SUSPENDED:
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          label: 'Suspended'
        };
      case IdentityStatus.PENDING_VERIFICATION:
        return {
          icon: Clock,
          color: 'text-blue-600',
          label: 'Pending'
        };
      case IdentityStatus.DELETED:
        return {
          icon: XCircle,
          color: 'text-gray-600',
          label: 'Deleted'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Icon className={cn(sizeClasses[size], config.color)} />
      {showLabel && (
        <span className={cn(
          'text-sm',
          config.color,
          size === 'sm' && 'text-xs'
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// Security Status Badge Component
interface SecurityStatusBadgeProps {
  identity: ExtendedSquidIdentity;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

export const SecurityStatusBadge: React.FC<SecurityStatusBadgeProps> = ({
  identity,
  variant = 'outline',
  size = 'md',
  className
}) => {
  const getSecurityLevel = () => {
    let score = 0;
    let issues: string[] = [];

    // KYC verification
    if (identity.kyc.approved) {
      score += 30;
    } else if (identity.kyc.required) {
      issues.push('KYC required');
    }

    // Governance
    if (identity.governanceLevel !== GovernanceType.SELF) {
      score += 20;
    }

    // Security flags
    const criticalFlags = identity.securityFlags.filter(flag => flag.severity === 'CRITICAL' || flag.severity === 'HIGH');
    if (criticalFlags.length === 0) {
      score += 25;
    } else {
      issues.push(`${criticalFlags.length} security alert${criticalFlags.length > 1 ? 's' : ''}`);
    }

    // Recent activity
    const lastUsed = new Date(identity.lastUsed);
    const daysSinceLastUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 7) {
      score += 15;
    }

    // Encryption keys
    if (identity.qlockKeyPair) {
      score += 10;
    }

    return { score, issues };
  };

  const { score, issues } = getSecurityLevel();

  const getSecurityConfig = () => {
    if (score >= 80) {
      return {
        label: 'High Security',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: ShieldCheck
      };
    } else if (score >= 60) {
      return {
        label: 'Medium Security',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Shield
      };
    } else if (score >= 40) {
      return {
        label: 'Low Security',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: ShieldAlert
      };
    } else {
      return {
        label: 'Security Risk',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: ShieldX
      };
    }
  };

  const config = getSecurityConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'outline' && config.color,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'inline-flex items-center gap-1',
        className
      )}
      title={issues.length > 0 ? `Issues: ${issues.join(', ')}` : undefined}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// KYC Status Badge Component
interface KYCStatusBadgeProps {
  kyc: ExtendedSquidIdentity['kyc'];
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

export const KYCStatusBadge: React.FC<KYCStatusBadgeProps> = ({
  kyc,
  variant = 'outline',
  size = 'md',
  className
}) => {
  const getKYCConfig = () => {
    if (!kyc.required) {
      return {
        label: 'KYC N/A',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: UserX
      };
    }

    if (kyc.approved) {
      return {
        label: 'KYC Verified',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: UserCheck
      };
    }

    if (kyc.submitted) {
      return {
        label: 'KYC Pending',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock
      };
    }

    return {
      label: 'KYC Required',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle
    };
  };

  const config = getKYCConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'outline' && config.color,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'inline-flex items-center gap-1',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Governance Badge Component
interface GovernanceBadgeProps {
  governanceType: GovernanceType;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

export const GovernanceBadge: React.FC<GovernanceBadgeProps> = ({
  governanceType,
  variant = 'outline',
  size = 'md',
  className
}) => {
  const getGovernanceConfig = () => {
    switch (governanceType) {
      case GovernanceType.SELF:
        return {
          label: 'Self-Governed',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: User
        };
      case GovernanceType.DAO:
        return {
          label: 'DAO Governed',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Users
        };
      case GovernanceType.PARENT:
        return {
          label: 'Parent Controlled',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Shield
        };
      case GovernanceType.AUTONOMOUS:
        return {
          label: 'Autonomous',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: Zap
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle
        };
    }
  };

  const config = getGovernanceConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'outline' && config.color,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        'inline-flex items-center gap-1',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Security Flags Indicator Component
interface SecurityFlagsIndicatorProps {
  flags: SecurityFlag[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const SecurityFlagsIndicator: React.FC<SecurityFlagsIndicatorProps> = ({
  flags,
  maxDisplay = 3,
  size = 'md',
  className
}) => {
  if (flags.length === 0) {
    return null;
  }

  const criticalFlags = flags.filter(flag => flag.severity === 'CRITICAL');
  const highFlags = flags.filter(flag => flag.severity === 'HIGH');
  const mediumFlags = flags.filter(flag => flag.severity === 'MEDIUM');
  const lowFlags = flags.filter(flag => flag.severity === 'LOW');

  const displayFlags = [
    ...criticalFlags.slice(0, maxDisplay),
    ...highFlags.slice(0, Math.max(0, maxDisplay - criticalFlags.length)),
    ...mediumFlags.slice(0, Math.max(0, maxDisplay - criticalFlags.length - highFlags.length)),
    ...lowFlags.slice(0, Math.max(0, maxDisplay - criticalFlags.length - highFlags.length - mediumFlags.length))
  ];

  const remainingCount = flags.length - displayFlags.length;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {displayFlags.map((flag, index) => {
        const getSeverityConfig = (severity: SecurityFlag['severity']) => {
          switch (severity) {
            case 'CRITICAL':
              return { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle };
            case 'HIGH':
              return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle };
            case 'MEDIUM':
              return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle };
            case 'LOW':
              return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle };
            default:
              return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
          }
        };

        const config = getSeverityConfig(flag.severity);
        const Icon = config.icon;

        return (
          <Badge
            key={flag.id}
            variant="outline"
            className={cn(
              config.color,
              size === 'sm' && 'text-xs px-1.5 py-0.5',
              'inline-flex items-center gap-1'
            )}
            title={flag.description}
          >
            <Icon className="h-3 w-3" />
            {flag.type.replace('_', ' ')}
          </Badge>
        );
      })}
      
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'bg-gray-100 text-gray-800 border-gray-200',
            size === 'sm' && 'text-xs px-1.5 py-0.5'
          )}
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

// Comprehensive Identity Badge Set Component
interface IdentityBadgeSetProps {
  identity: ExtendedSquidIdentity;
  showType?: boolean;
  showPrivacy?: boolean;
  showStatus?: boolean;
  showSecurity?: boolean;
  showKYC?: boolean;
  showGovernance?: boolean;
  showFlags?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

export const IdentityBadgeSet: React.FC<IdentityBadgeSetProps> = ({
  identity,
  showType = true,
  showPrivacy = true,
  showStatus = false,
  showSecurity = false,
  showKYC = false,
  showGovernance = false,
  showFlags = false,
  variant = 'outline',
  size = 'md',
  className
}) => {
  return (
    <div className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      {showType && (
        <IdentityTypeBadge 
          type={identity.type} 
          variant={variant} 
          size={size} 
        />
      )}
      
      {showPrivacy && (
        <PrivacyLevelBadge 
          level={identity.privacyLevel} 
          variant={variant} 
          size={size} 
        />
      )}
      
      {showStatus && (
        <Badge 
          variant={variant}
          className={cn(
            size === 'sm' && 'text-xs px-1.5 py-0.5',
            'inline-flex items-center gap-1'
          )}
        >
          <IdentityStatusIndicator status={identity.status} size={size} />
          {identity.status}
        </Badge>
      )}
      
      {showSecurity && (
        <SecurityStatusBadge 
          identity={identity} 
          variant={variant} 
          size={size} 
        />
      )}
      
      {showKYC && (
        <KYCStatusBadge 
          kyc={identity.kyc} 
          variant={variant} 
          size={size} 
        />
      )}
      
      {showGovernance && (
        <GovernanceBadge 
          governanceType={identity.governanceLevel} 
          variant={variant} 
          size={size} 
        />
      )}
      
      {showFlags && identity.securityFlags.length > 0 && (
        <SecurityFlagsIndicator 
          flags={identity.securityFlags} 
          size={size} 
        />
      )}
    </div>
  );
};

export default {
  IdentityTypeIcon,
  IdentityTypeBadge,
  PrivacyLevelBadge,
  IdentityStatusIndicator,
  SecurityStatusBadge,
  KYCStatusBadge,
  GovernanceBadge,
  SecurityFlagsIndicator,
  IdentityBadgeSet
};