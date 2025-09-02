
import { useState, useEffect } from 'react';
import { Layout } from '@/components/common/Layout';
import { ModuleCard } from '@/components/common/ModuleCard';
import { ShieldCheck, ShieldAlert, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getUser } from '@/api/squid';
import { Identity, IdentityVerificationLevel, User as UserType } from '@/types';
import { IdentityCard } from '@/components/squid/IdentityCard';
import { IdentityTree } from '@/components/squid/IdentityTree';

export default function SquidPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    // TODO: Integrate with real identity verification system
    // TODO: Connect with decentralized wallet and public key infrastructure
    // TODO: Implement smart contract based operation authentication
    const fetchUser = async () => {
      try {
        const response = await getUser('demo-user');
        if (response.success && response.user) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return (
      <Layout module="squid">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading identity data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout module="squid">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Identity Management</h1>
          {user.primaryIdentity.kycStatus.approved && (
            <Button 
              variant="outline" 
              className="hover:bg-primary/10"
            >
              <User className="w-4 h-4 mr-2" />
              Add Sub-Identity
            </Button>
          )}
        </header>

        <IdentityTree 
          rootIdentity={user.primaryIdentity}
          subIdentities={user.subIdentities}
          expandedNodes={expandedNodes}
          onToggleNode={(id) => {
            setExpandedNodes(prev => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          }}
        />
      </div>
    </Layout>
  );
}
