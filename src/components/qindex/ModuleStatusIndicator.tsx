
import { Check, AlertTriangle, X } from 'lucide-react';

export type ModuleStatus = 'verified' | 'pending' | 'outOfSync';

interface ModuleStatusIndicatorProps {
  status: ModuleStatus;
}

export function ModuleStatusIndicator({ status }: ModuleStatusIndicatorProps) {
  const getStatusIcon = (status: ModuleStatus) => {
    switch (status) {
      case 'verified':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'outOfSync':
        return <X className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: ModuleStatus) => {
    switch (status) {
      case 'verified':
        return 'Verificado';
      case 'pending':
        return 'Pendiente';
      case 'outOfSync':
        return 'Desincronizado';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon(status)}
      <span className="font-medium">{getStatusText(status)}</span>
    </div>
  );
}
