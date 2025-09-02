
import React, { useEffect, useState } from "react";

// Mocks: importar logs desde Qindex y Qerberos
import { getFileLogs } from "@/lib/qindex";
import { getAccessAttempts } from "@/lib/qerberos";
import { Badge } from "@/components/ui/badge";

interface LogItem {
  id: string;
  type: "Qindex" | "Qerberos";
  action: string;
  module: string;
  status: string;
  timestamp: string;
  summary: string;
}

export const IdentityActivityLog: React.FC<{ identityId: string }> = ({ identityId }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    // Cargar logs simulados desde ambos módulos
    const qindex = getFileLogs().filter(log => log.identityDID === identityId).map(log => ({
      id: log.id,
      type: "Qindex" as const,
      action: log.operation,
      module: "Qindex",
      status: "OK",
      timestamp: log.timestamp,
      summary: `Archivo: ${log.fileName ?? "?"}`
    }));

    const qerberos = getAccessAttempts().filter(a => a.identityDID === identityId).map(att => ({
      id: att.id,
      type: "Qerberos" as const,
      action: att.status,
      module: "Qerberos",
      status: att.status,
      timestamp: att.timestamp,
      summary: att.reason
    }));

    setLogs([...qindex, ...qerberos].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }, [identityId]);

  return (
    <div className="p-4 bg-background border rounded-lg shadow mt-2">
      <div className="font-medium mb-2 text-primary">Historial de actividad</div>
      <div className="max-h-64 overflow-y-auto text-xs">
        {logs.length === 0 ? (
          <div className="text-muted-foreground">Sin actividad registrada.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="py-1">Fecha</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap py-1">{log.timestamp.slice(0, 19).replace("T", " ")}</td>
                  <td><Badge>{log.module}</Badge></td>
                  <td>{log.action}</td>
                  <td>
                    <Badge variant={(log.status === "OK" || log.status === "AUTHORIZED" || log.status === "SUCCESS") ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                  </td>
                  <td>{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
