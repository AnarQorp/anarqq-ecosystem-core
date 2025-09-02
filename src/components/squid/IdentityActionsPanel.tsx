
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, Cog, LogOut } from "lucide-react";
import type { MockIdentity } from "@/lib/squid";

interface Props {
  isRoot: boolean;
  onLogout: () => void;
}

export const IdentityActionsPanel: React.FC<Props> = ({ isRoot, onLogout }) => (
  <div className="p-4 rounded-lg bg-background border flex flex-wrap gap-2 shadow">
    {isRoot && (
      <>
        <Button variant="secondary" size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          Crear subidentidad
        </Button>
        <Button variant="secondary" size="sm" className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" />
          Marcar como AID
        </Button>
        <Button variant="secondary" size="sm" className="flex items-center gap-1">
          <Cog className="w-4 h-4" />
          Regenerar clave Qlock
        </Button>
      </>
    )}
    <Button variant="destructive" size="sm" className="flex items-center gap-1" onClick={onLogout}>
      <LogOut className="w-4 h-4" /> Desconectar identidad
    </Button>
  </div>
);
