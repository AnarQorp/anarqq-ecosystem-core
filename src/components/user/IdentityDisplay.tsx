
import { Identity, IdentityVerificationLevel, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/utils/formatDate';
import { User as UserIcon, Shield, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';

interface IdentityDisplayProps {
  identity: Identity;
  isActive?: boolean;
  showDetails?: boolean;
}

export function IdentityDisplay({ identity, isActive = false, showDetails = false }: IdentityDisplayProps) {
  const getVerificationBadge = (level: IdentityVerificationLevel) => {
    switch (level) {
      case IdentityVerificationLevel.ROOT:
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Root
          </Badge>
        );
      case IdentityVerificationLevel.VERIFIED:
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <Shield className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case IdentityVerificationLevel.UNVERIFIED:
        return (
          <Badge variant="outline">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Unverified
          </Badge>
        );
    }
  };

  return (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-primary flex items-center">
            <UserIcon className="w-4 h-4 mr-2 text-primary" />
            {identity.name}
          </CardTitle>
          {getVerificationBadge(identity.verificationLevel)}
        </div>
        <CardDescription className="flex items-center text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Created {formatRelativeTime(identity.created)}
        </CardDescription>
      </CardHeader>
      
      {showDetails && (
        <CardContent className="pb-2 text-sm space-y-1.5">
          <div>
            <span className="font-medium">ID:</span> {identity.id}
          </div>
          <div>
            <span className="font-medium">Public Key:</span>
            <div className="font-mono text-xs bg-muted p-1 rounded mt-1 overflow-x-auto">
              {identity.publicKey.slice(0, 20)}...{identity.publicKey.slice(-20)}
            </div>
          </div>
          {identity.parentId && (
            <div>
              <span className="font-medium">Parent Identity:</span> {identity.parentId}
            </div>
          )}
          <div>
            <span className="font-medium">Verification Status:</span>
            <span className="ml-1">
              {identity.kycStatus.approved 
                ? 'Approved' 
                : identity.kycStatus.submitted 
                  ? 'Submitted, Awaiting Approval' 
                  : 'Not Submitted'}
            </span>
          </div>
        </CardContent>
      )}

      <CardFooter className="pt-2">
        {identity.kycStatus.approved ? (
          <span className="text-xs text-green-600 flex items-center">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Verified {identity.kycStatus.timestamp && formatRelativeTime(identity.kycStatus.timestamp)}
          </span>
        ) : identity.kycStatus.submitted ? (
          <span className="text-xs text-amber-600 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Verification pending
          </span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Not verified
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

interface UserIdentitiesProps {
  user: User;
  activeIdentityId?: string;
  onChangeIdentity?: (identity: Identity) => void;
}

export function UserIdentities({ user, activeIdentityId, onChangeIdentity }: UserIdentitiesProps) {
  const handleIdentityClick = (identity: Identity) => {
    if (onChangeIdentity) {
      onChangeIdentity(identity);
    }
  };

  const allIdentities = [user.primaryIdentity, ...user.subIdentities];
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Identities</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allIdentities.map(identity => (
          <div 
            key={identity.id}
            onClick={() => handleIdentityClick(identity)}
            className={onChangeIdentity ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}
          >
            <IdentityDisplay 
              identity={identity} 
              isActive={identity.id === activeIdentityId} 
              showDetails={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
