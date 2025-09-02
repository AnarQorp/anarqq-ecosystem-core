
import React from 'react';
import { useIdentityStore } from '@/state/identity';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import QdriveTabs from '@/components/qdrive/QdriveTabs';

export default function Qpic() {
  const { activeIdentity, isAuthenticated } = useIdentityStore();

  if (!isAuthenticated || !activeIdentity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Qpic – Galería privada cifrada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">Debes iniciar sesión con sQuid.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Qpic – Galería privada cifrada</h1>
        <p className="text-muted-foreground mb-4">
          Tus imágenes y videos estarán cifrados y protegidos por tu identidad sQuid.
        </p>
        <div className="text-sm text-muted-foreground">
          <p><strong>Usuario activo:</strong> {activeIdentity.name}</p>
          <p><strong>DID:</strong> {activeIdentity.did.slice(0, 32)}...</p>
        </div>
      </div>

      <QdriveTabs isQpic={true} />
    </div>
  );
}
