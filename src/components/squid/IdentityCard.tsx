
import { Identity, IdentityVerificationLevel } from '@/types';
import { ModuleCard } from '@/components/common/ModuleCard';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IdentityCardProps {
  identity: Identity;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren?: boolean;
  depth?: number;
}

export function IdentityCard({ 
  identity, 
  isExpanded, 
  onToggle, 
  hasChildren = false,
  depth = 0 
}: IdentityCardProps) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  
  return (
    <ModuleCard
      moduleId="squid"
      isActive={true}
      showDescription={false}
      className="transition-all hover:shadow-md"
    >
      <div className="flex items-center space-x-4">
        {hasChildren && (
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-accent rounded-full transition-colors"
          >
            <ChevronIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{identity.name}</span>
            <Badge variant="outline" className="text-xs">
              {identity.verificationLevel === IdentityVerificationLevel.ROOT ? (
                <span className="flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1 text-green-500" />
                  Root
                </span>
              ) : (
                <span className="flex items-center">
                  <ShieldAlert className="w-3 h-3 mr-1 text-amber-500" />
                  Sub-Identity
                </span>
              )}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            ID: {identity.id.slice(0, 8)}...
            {/* TODO: Add connection to Web3 wallet */}
            {/* TODO: Add inherited permissions from smart contract */}
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Public Key:</span>
            <code className="ml-1 p-0.5 bg-muted rounded">
              {identity.publicKey.slice(0, 12)}...
            </code>
          </div>
        </div>
      </div>
    </ModuleCard>
  );
}
