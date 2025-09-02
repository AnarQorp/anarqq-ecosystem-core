
import React from "react";
import type { MockIdentity } from "@/lib/squid";
import { Badge } from "@/components/ui/badge";

// Mock permisos: visualización y botón (sin edición real todavía)
const MODULES = [
  { id: "qmail", name: "Qmail" },
  { id: "qlock", name: "Qlock" },
  { id: "qindex", name: "Qindex" },
  { id: "qonsent", name: "Qonsent" },
  { id: "ipfs", name: "IPFS" },
  { id: "dao", name: "DAO" },
];

export const IdentityPermissionsPanel: React.FC<{ identity: MockIdentity }> = ({ identity }) => (
  <div className="p-4 rounded-lg bg-background border shadow">
    <div className="font-medium mb-2 text-primary">Permisos de módulos</div>
    <div className="flex flex-wrap gap-3">
      {MODULES.map(mod =>
        <div key={mod.id} className="flex items-center gap-2">
          <Badge>{mod.name}</Badge>
          <span className={`w-2 h-2 rounded-full ${identity.qonsentGranted ? "bg-green-500" : "bg-gray-300"}`} />
        </div>
      )}
    </div>
    <div className="text-xs text-muted-foreground mt-3">Solo la <b>identidad raíz</b> puede editar permisos.</div>
  </div>
);
