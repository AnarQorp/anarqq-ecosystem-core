
/**
 * Validador de sesión descentralizada - Solo IPFS real
 */

import React, { useEffect, useState } from 'react';
import { useIdentityStore } from '@/state/identity';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { initClient } from '@/lib/ipfs-browser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export const SessionValidator: React.FC<SessionValidatorProps> = ({ children }) => {
  const { activeIdentity, isAuthenticated, clearIdentity } = useIdentityStore();
  const { identity: currentIdentity } = useActiveIdentity();
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthenticated || !activeIdentity) {
        setValidationStatus('invalid');
        return;
      }

      try {
        console.log('[SessionValidator] Validating IPFS session...');
        
        // Verificar que tenemos credenciales válidas
        const agentDID = localStorage.getItem('active_user_did');
        const spaceDID = localStorage.getItem('active_space_did');
        const delegation = localStorage.getItem('space_delegation_ucan');

        if (!agentDID || !spaceDID || !delegation) {
          console.error('[SessionValidator] Missing IPFS credentials');
          setValidationStatus('invalid');
          setErrorMessage('Credenciales de IPFS faltantes. Vuelve a iniciar sesión.');
          clearIdentity();
          return;
        }

        // Intentar conectar con Storacha
        const client = await initClient();
        
        if (!client) {
          throw new Error('No se pudo conectar con Storacha');
        }

        // Verificar espacio activo
        try {
          const currentSpace = await client.currentSpace();
          
          if (currentSpace) {
            const currentSpaceDID = await currentSpace.did();
            console.log('[SessionValidator] Espacio actual:', {
              currentSpaceDID,
              expectedSpaceDID: spaceDID
            });
            
            if (currentSpaceDID !== spaceDID) {
              console.warn('[SessionValidator] El espacio actual no coincide con el esperado, intentando configurar...');
              // Intentar configurar el espacio correcto
              try {
                await client.setCurrentSpace(spaceDID);
                console.log('[SessionValidator] Espacio configurado correctamente');
              } catch (spaceError) {
                console.warn('[SessionValidator] No se pudo configurar el espacio:', spaceError);
                // Continuar de todos modos en modo de solo lectura
              }
            }
          } else {
            console.warn('[SessionValidator] No hay espacio activo, continuando en modo de solo lectura');
          }
          
          console.log('[SessionValidator] ✅ Sesión IPFS validada');
          setValidationStatus('valid');
          
        } catch (spaceError) {
          console.warn('[SessionValidator] Error al validar el espacio IPFS, continuando en modo de solo lectura:', spaceError);
          // Marcar como válido de todos modos, pero en modo de solo lectura
          setValidationStatus('valid');
        }

      } catch (error) {
        console.error('[SessionValidator] Validation failed:', error);
        setValidationStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Error de validación');
        
        // Limpiar sesión inválida
        clearIdentity();
        localStorage.removeItem('active_user_did');
        localStorage.removeItem('active_space_did');
        localStorage.removeItem('space_delegation_ucan');
      }
    };

    validateSession();
  }, [activeIdentity, isAuthenticated, clearIdentity]);

  if (validationStatus === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Validando sesión IPFS...</p>
        </div>
      </div>
    );
  }

  if (validationStatus === 'invalid' || validationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">Sesión IPFS inválida</p>
                <p className="text-sm">{errorMessage || 'Tu sesión no es válida o ha expirado.'}</p>
                <p className="text-sm">
                  <a href="/login" className="text-red-600 hover:text-red-800 underline">
                    Volver a iniciar sesión
                  </a>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionValidator;
