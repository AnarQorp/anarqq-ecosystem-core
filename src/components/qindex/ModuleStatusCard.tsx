
import { useState } from 'react';
import { ModuleCard } from '@/components/common/ModuleCard';
import { Button } from '@/components/ui/button';
import { ModuleStatusIndicator, ModuleStatus } from './ModuleStatusIndicator';
import { ReputationStars } from './ReputationStars';
import type { ModuleState as BlockchainState } from '@/utils/contracts';

export interface ModuleState {
  id: string;
  status: ModuleStatus;
  packetsWaiting: number;
  reputation: number;
  lastValidated: Date;
}

interface ModuleStatusCardProps {
  module: ModuleState;
  onRevalidate: (moduleId: string) => void;
  validating: string | null;
  blockchainState?: BlockchainState;
  onRegister: () => void;
  registering: boolean;
}

export function ModuleStatusCard({ 
  module, 
  onRevalidate, 
  validating,
  blockchainState,
  onRegister,
  registering 
}: ModuleStatusCardProps) {
  return (
    <ModuleCard
      key={module.id}
      moduleId={module.id}
      isActive={true}
      className="h-full transition-all"
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <ModuleStatusIndicator status={module.status} />
          {module.packetsWaiting > 0 && (
            <div className="bg-secondary/50 text-xs px-2 py-1 rounded-full">
              {module.packetsWaiting} paquetes
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Reputación:</span>
            <div className="mt-1">
              <ReputationStars reputation={module.reputation} />
            </div>
          </div>
          <div className="text-xs text-right text-muted-foreground">
            Últ. validación:<br />
            {module.lastValidated.toLocaleTimeString()}
          </div>
        </div>
        
        {blockchainState && (
          <div className="border-t pt-2 mt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado en Chain:</span>
              <span className={blockchainState.isRegistered ? "text-green-500" : "text-yellow-500"}>
                {blockchainState.isRegistered ? "Registrado" : "No Registrado"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nodos:</span>
              <span>{blockchainState.nodeCount}</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevalidate(module.id)}
            disabled={validating === module.id}
          >
            {validating === module.id ? (
              <span className="flex items-center">
                <span className="animate-pulse mr-2">⏳</span> Revalidando...
              </span>
            ) : (
              'Revalidar'
            )}
          </Button>
          
          {(!blockchainState?.isRegistered || registering) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRegister}
              disabled={registering}
            >
              {registering ? (
                <span className="flex items-center">
                  <span className="animate-pulse mr-2">⏳</span> Registrando...
                </span>
              ) : (
                'Registrar en Blockchain'
              )}
            </Button>
          )}
        </div>
      </div>
    </ModuleCard>
  );
}
