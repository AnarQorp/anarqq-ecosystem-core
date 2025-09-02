/**
 * IdentitySwitcher Component
 * Identity selection dropdown/grid interface with type indicators, status badges, and smooth switching
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronDown, 
  User, 
  Building2, 
  Shield, 
  Eye, 
  EyeOff,
  Crown,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useToast } from '@/hooks/use-toast';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType 
} from '@/types/identity';
import { cn } from '@/lib/utils';

// Component Props Interface
export interface IdentitySwitcherProps {
  /** Display mode: dropdown or grid */
  mode?: 'dropdown' | 'grid';
  /** Show security badges and indicators */
  showSecurityBadges?: boolean;
  /** Compact mode for smaller spaces */
  compactMode?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback when identity is switched */
  onIdentitySwitch?: (identity: ExtendedSquidIdentity) => void;
  /** Callback when switching fails */
  onSwitchError?: (error: string) => void;
}

// Identity Type Icons
const getIdentityTypeIcon = (type: IdentityType) => {
  switch (type) {
    case IdentityType.ROOT:
      return Crown;
    case IdentityType.DAO:
      return Users;
    case IdentityType.ENTERPRISE:
      return Building2;
    case IdentityType.CONSENTIDA:
      return Shield;
    case IdentityType.AID:
      return EyeOff;
    default:
      return User;
  }
};

// Privacy Level Colors
const getPrivacyLevelColor = (level: PrivacyLevel) => {
  switch (level) {
    case PrivacyLevel.PUBLIC:
      return 'bg-green-100 text-green-800 border-green-200';
    case PrivacyLevel.DAO_ONLY:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case PrivacyLevel.PRIVATE:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case PrivacyLevel.ANONYMOUS:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Status Icons
const getStatusIcon = (status: IdentityStatus) => {
  switch (status) {
    case IdentityStatus.ACTIVE:
      return CheckCircle;
    case IdentityStatus.INACTIVE:
      return XCircle;
    case IdentityStatus.SUSPENDED:
      return AlertCircle;
    case IdentityStatus.PENDING_VERIFICATION:
      return Loader2;
    default:
      return AlertCircle;
  }
};

// Status Colors
const getStatusColor = (status: IdentityStatus) => {
  switch (status) {
    case IdentityStatus.ACTIVE:
      return 'text-green-600';
    case IdentityStatus.INACTIVE:
      return 'text-red-600';
    case IdentityStatus.SUSPENDED:
      return 'text-orange-600';
    case IdentityStatus.PENDING_VERIFICATION:
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

// Identity Item Component
interface IdentityItemProps {
  identity: ExtendedSquidIdentity;
  isActive: boolean;
  showSecurityBadges: boolean;
  compactMode: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const IdentityItem: React.FC<IdentityItemProps> = ({
  identity,
  isActive,
  showSecurityBadges,
  compactMode,
  onClick,
  disabled = false
}) => {
  const TypeIcon = getIdentityTypeIcon(identity.type);
  const StatusIcon = getStatusIcon(identity.status);
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-primary/10 border border-primary/20",
        disabled && "opacity-50 cursor-not-allowed",
        compactMode && "p-2 gap-2"
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* Avatar */}
      <Avatar className={cn("shrink-0", compactMode ? "h-8 w-8" : "h-10 w-10")}>
        {identity.avatar ? (
          <AvatarImage src={identity.avatar} alt={identity.name} />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
            <TypeIcon className={cn(compactMode ? "h-3 w-3" : "h-4 w-4")} />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Identity Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate",
            compactMode ? "text-sm" : "text-base"
          )}>
            {identity.name}
          </span>
          
          {/* Type Badge */}
          <Badge 
            variant={identity.type === IdentityType.ROOT ? "default" : "secondary"}
            className={cn(compactMode && "text-xs px-1.5 py-0.5")}
          >
            {identity.type}
          </Badge>
          
          {isActive && (
            <Badge variant="outline" className={cn(
              "text-primary border-primary",
              compactMode && "text-xs px-1.5 py-0.5"
            )}>
              Active
            </Badge>
          )}
        </div>

        {!compactMode && (
          <div className="flex items-center gap-2 mt-1">
            {/* Privacy Level */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                getPrivacyLevelColor(identity.privacyLevel)
              )}
            >
              {identity.privacyLevel.replace('_', ' ')}
            </Badge>

            {/* Status */}
            <div className="flex items-center gap-1">
              <StatusIcon className={cn(
                "h-3 w-3",
                getStatusColor(identity.status)
              )} />
              <span className="text-xs text-muted-foreground">
                {identity.status}
              </span>
            </div>

            {/* Security Badges */}
            {showSecurityBadges && (
              <>
                {identity.kyc.approved && (
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                    KYC ✓
                  </Badge>
                )}
                
                {identity.governanceLevel === GovernanceType.DAO && (
                  <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                    DAO
                  </Badge>
                )}
                
                {identity.securityFlags.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {identity.securityFlags.length} Alert{identity.securityFlags.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
      )}
    </div>
  );
};

// Main IdentitySwitcher Component
export const IdentitySwitcher: React.FC<IdentitySwitcherProps> = ({
  mode = 'dropdown',
  showSecurityBadges = true,
  compactMode = false,
  className,
  onIdentitySwitch,
  onSwitchError
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  
  const { identities, switchIdentity, loading } = useIdentityManager();
  const { identity: activeIdentity } = useActiveIdentity();
  const { toast } = useToast();

  // Filter and sort identities
  const sortedIdentities = useMemo(() => {
    return identities
      .filter(identity => identity.status === IdentityStatus.ACTIVE)
      .sort((a, b) => {
        // Root identity first
        if (a.type === IdentityType.ROOT) return -1;
        if (b.type === IdentityType.ROOT) return 1;
        
        // Then by last used
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });
  }, [identities]);

  // Handle identity switch
  const handleIdentitySwitch = useCallback(async (identity: ExtendedSquidIdentity) => {
    if (identity.did === activeIdentity?.did) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitchingTo(identity.did);
      
      const result = await switchIdentity(identity.did);
      
      if (result.success) {
        toast({
          title: "Identity Switched",
          description: `Now operating as ${identity.name}`,
        });
        
        onIdentitySwitch?.(identity);
      } else {
        throw new Error(result.error || 'Failed to switch identity');
      }
      
      setIsOpen(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Switch Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onSwitchError?.(errorMessage);
    } finally {
      setSwitchingTo(null);
    }
  }, [activeIdentity, switchIdentity, toast, onIdentitySwitch, onSwitchError]);

  // Get current identity display info
  const currentIdentityInfo = useMemo(() => {
    if (!activeIdentity) {
      return {
        name: 'No Identity',
        type: 'NONE' as IdentityType,
        avatar: null,
        status: IdentityStatus.INACTIVE
      };
    }
    
    return {
      name: activeIdentity.name,
      type: activeIdentity.type,
      avatar: activeIdentity.avatar,
      status: activeIdentity.status
    };
  }, [activeIdentity]);

  // Render dropdown mode
  if (mode === 'dropdown') {
    const TypeIcon = getIdentityTypeIcon(currentIdentityInfo.type);
    
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between min-w-[200px]",
              compactMode && "min-w-[150px] h-8 text-sm",
              className
            )}
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <Avatar className={cn(compactMode ? "h-5 w-5" : "h-6 w-6")}>
                {currentIdentityInfo.avatar ? (
                  <AvatarImage src={currentIdentityInfo.avatar} alt={currentIdentityInfo.name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                    <TypeIcon className={cn(compactMode ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  </AvatarFallback>
                )}
              </Avatar>
              
              <span className="truncate">{currentIdentityInfo.name}</span>
              
              {showSecurityBadges && activeIdentity?.kyc.approved && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                  ✓
                </Badge>
              )}
            </div>
            
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-80" 
          align="start"
          sideOffset={5}
        >
          <DropdownMenuLabel>Switch Identity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {sortedIdentities.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No identities available
            </div>
          ) : (
            sortedIdentities.map((identity) => (
              <DropdownMenuItem key={identity.did} asChild>
                <div className="p-0">
                  <IdentityItem
                    identity={identity}
                    isActive={identity.did === activeIdentity?.did}
                    showSecurityBadges={showSecurityBadges}
                    compactMode={compactMode}
                    onClick={() => handleIdentitySwitch(identity)}
                    disabled={switchingTo === identity.did}
                  />
                  
                  {switchingTo === identity.did && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Render grid mode
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className={cn("p-4", compactMode && "p-3")}>
        <div className="space-y-2">
          <h3 className={cn(
            "font-semibold text-foreground",
            compactMode ? "text-sm" : "text-base"
          )}>
            Switch Identity
          </h3>
          
          <div className="grid gap-2">
            {sortedIdentities.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No identities available
              </div>
            ) : (
              sortedIdentities.map((identity) => (
                <div key={identity.did} className="relative">
                  <IdentityItem
                    identity={identity}
                    isActive={identity.did === activeIdentity?.did}
                    showSecurityBadges={showSecurityBadges}
                    compactMode={compactMode}
                    onClick={() => handleIdentitySwitch(identity)}
                    disabled={switchingTo === identity.did}
                  />
                  
                  {switchingTo === identity.did && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdentitySwitcher;