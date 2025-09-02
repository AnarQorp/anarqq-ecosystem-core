
import { Card, CardContent } from '@/components/ui/card';
import { ReputationStars } from './ReputationStars';
import { ModuleState } from './ModuleStatusCard';

interface QindexStatsProps {
  modules: ModuleState[];
}

export function QindexStats({ modules }: QindexStatsProps) {
  const averageReputation = modules.reduce((acc, m) => acc + m.reputation, 0) / (modules.length || 1);
  
  return (
    <Card className="bg-secondary/30 p-4">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">Módulos Activos:</span> {modules.length}
          </div>
          <div>
            <span className="font-semibold">Verificados:</span> {modules.filter(m => m.status === 'verified').length}
          </div>
          <div>
            <span className="font-semibold">Paquetes en Espera:</span> {modules.reduce((acc, m) => acc + m.packetsWaiting, 0)}
          </div>
          <div>
            <span className="font-semibold">Reputación del Nodo:</span> {' '}
            <ReputationStars reputation={averageReputation} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
