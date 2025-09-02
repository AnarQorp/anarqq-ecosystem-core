
import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Link } from "lucide-react";
import type { MockIdentity } from "@/lib/squid";

interface Props { identity: MockIdentity; }

export const ActiveIdentityCard: React.FC<Props> = ({ identity }) => (
  <div className="p-4 rounded-lg bg-background shadow flex flex-col gap-2 border">
    <div className="flex items-center gap-4">
      <ShieldCheck className="w-6 h-6 text-green-500" />
      <div>
        <span className="font-medium text-lg">{identity.name}</span>
        <Badge className="ml-2">{identity.type}</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Reputación</span>
        <span className="font-bold">{identity.reputation}</span>
      </div>
    </div>
    <div className="text-xs text-muted-foreground truncate">
      ID: {identity.id}
    </div>
    <div className="flex items-center gap-2 text-xs mt-1">
      <Link className="w-3 h-3" />
      <span>Wallet: <span className="font-mono text-foreground">{identity.wallet}</span></span>
    </div>
    {!identity.qlockActive && (
      <div className="flex items-center gap-1 text-yellow-600 mt-2 text-xs">
        <AlertTriangle className="w-4 h-4" />
        ¡Clave Qlock inactiva!
      </div>
    )}
    {!identity.qonsentGranted && (
      <div className="flex items-center gap-1 text-yellow-600 text-xs">
        <AlertTriangle className="w-4 h-4" />
        Permisos de Qonsent no otorgados.
      </div>
    )}
  </div>
);
