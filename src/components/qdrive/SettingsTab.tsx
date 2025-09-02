
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIdentityStore } from '@/state/identity';

interface SettingsTabProps {
  isQpic?: boolean;
}

export default function SettingsTab({ isQpic = false }: SettingsTabProps) {
  const { activeIdentity } = useIdentityStore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Configuración de {isQpic ? 'Qpic' : 'Qdrive'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Módulo activo</h4>
              <Badge variant="secondary" className="text-base">
                {isQpic ? '📸 Qpic - Galería multimedia cifrada' : '💾 Qdrive - Almacenamiento seguro'}
              </Badge>
            </div>

            {activeIdentity && (
              <div>
                <h4 className="font-medium mb-2">Identidad activa</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm"><strong>Nombre:</strong> {activeIdentity.name}</p>
                  <p className="text-sm"><strong>DID:</strong> {activeIdentity.did.slice(0, 32)}...</p>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Módulos integrados</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm">🔐 Qlock - Cifrado</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm">📋 Qindex - Indexado</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm">🛡️ Qerberos - Integridad</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm">🌐 IPFS - Red</span>
                </div>
              </div>
            </div>

            {isQpic && (
              <div>
                <h4 className="font-medium mb-2">Formatos soportados</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Imágenes:</strong> JPEG, PNG, GIF, WebP, SVG</p>
                  <p><strong>Videos:</strong> MP4, WebM, MOV</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración avanzada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Las configuraciones avanzadas estarán disponibles en futuras versiones.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Compresión automática</span>
              <Badge variant="outline">Próximamente</Badge>
            </div>
            <div className="flex justify-between">
              <span>Backup en Pi Network</span>
              <Badge variant="outline">Próximamente</Badge>
            </div>
            <div className="flex justify-between">
              <span>Compartir con otros usuarios</span>
              <Badge variant="outline">Próximamente</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
