
import React, { useState } from "react";
import { getActiveIdentity, logoutIdentity, MockIdentity } from "@/lib/squid";
import { ActiveIdentityCard } from "@/components/squid/ActiveIdentityCard";
import { IdentityTree } from "@/components/squid/IdentityTree";
import { IdentityPermissionsPanel } from "@/components/squid/IdentityPermissionsPanel";
import { IdentityActionsPanel } from "@/components/squid/IdentityActionsPanel";
import { IdentityActivityLog } from "@/components/squid/IdentityActivityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const SquidDashboard: React.FC = () => {
  const [identity, setIdentity] = useState<MockIdentity | null>(getActiveIdentity());

  const handleLogin = () => {
    // Al loguear, refrescamos la identidad activa
    setIdentity(getActiveIdentity());
  };

  const handleLogout = () => {
    logoutIdentity();
    setIdentity(null);
  };

  if (!identity) {
    return (
      <div className="container max-w-md mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Squid Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No hay identidad activa. Por favor, inicia sesión desde el sistema principal.
            </p>
            <Button onClick={handleLogin} className="w-full">
              Recargar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <ActiveIdentityCard identity={identity} />

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <IdentityTree 
            rootIdentity={identity}
            subIdentities={identity.subIdentities || []}
            expandedNodes={new Set([identity.id])}
            onToggleNode={() => {}}
          />
          <IdentityPermissionsPanel identity={identity} />
        </div>
        <div className="flex-1 space-y-4">
          <IdentityActionsPanel isRoot={identity.type === "ROOT"} onLogout={handleLogout} />
          <IdentityActivityLog identityId={identity.id} />
        </div>
      </div>
    </div>
  );
};

export default SquidDashboard;
