import { useState, useEffect } from 'react';
import { Layout } from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { moduleInfo } from '@/utils/mockData';
import { ModuleStatusCard, ModuleState } from '@/components/qindex/ModuleStatusCard';
import { QindexStats } from '@/components/qindex/QindexStats';
import { getModuleState, registerModule, type ModuleState as BlockchainState } from '@/utils/contracts';
import { toast } from 'sonner';

export default function QindexPage() {
  // Estado para módulos activos
  const [modules, setModules] = useState<ModuleState[]>([]);
  // Estado para animación de validación
  const [validating, setValidating] = useState<string | null>(null);
  // Estado para proceso de balanceo
  const [balancing, setBalancing] = useState(false);
  // Nuevo estado para blockchain
  const [blockchainStates, setBlockchainStates] = useState<Record<string, BlockchainState>>({});
  const [registering, setRegistering] = useState<string | null>(null);

  // Inicializar datos de módulos al cargar
  useEffect(() => {
    // Filtrar solo los módulos activos del mockData
    const activeModuleIds = Object.keys(moduleInfo).filter(
      (id) => moduleInfo[id as keyof typeof moduleInfo].active
    );
    
    // Crear estado inicial para cada módulo
    const initialModules: ModuleState[] = activeModuleIds.map(id => ({
      id,
      status: Math.random() > 0.7 ? 'verified' : (Math.random() > 0.5 ? 'pending' : 'outOfSync'),
      packetsWaiting: Math.floor(Math.random() * 100),
      reputation: Math.floor(Math.random() * 5) + 1,
      lastValidated: new Date(Date.now() - Math.floor(Math.random() * 86400000))
    }));
    
    setModules(initialModules);
  }, []);

  // Cargar estados de blockchain al iniciar
  useEffect(() => {
    const loadBlockchainStates = async () => {
      const states: Record<string, BlockchainState> = {};
      
      for (const moduleId of Object.keys(moduleInfo)) {
        if (moduleInfo[moduleId as keyof typeof moduleInfo].active) {
          try {
            states[moduleId] = await getModuleState(moduleId);
          } catch (err) {
            console.error(`Error loading blockchain state for ${moduleId}:`, err);
          }
        }
      }
      
      setBlockchainStates(states);
    };

    loadBlockchainStates();
  }, []);

  // Revalidar un módulo específico
  const handleRevalidate = (moduleId: string) => {
    setValidating(moduleId);
    
    // Simulación del proceso de validación (2 segundos)
    setTimeout(() => {
      setModules(prev => prev.map(module => {
        if (module.id === moduleId) {
          // Asignar nuevo estado aleatorio
          const newStatus = Math.random() > 0.7 ? 'verified' : 
                          (Math.random() > 0.5 ? 'pending' : 'outOfSync');
          return {
            ...module,
            status: newStatus,
            packetsWaiting: Math.max(0, module.packetsWaiting - Math.floor(Math.random() * 20)),
            lastValidated: new Date()
          };
        }
        return module;
      }));
      
      setValidating(null);
    }, 2000);
  };

  // Balancear carga en la red
  const handleBalanceLoad = () => {
    setBalancing(true);
    console.log("Cargando balanceadores...");
    
    // Simulación del proceso de balanceo (3 segundos)
    setTimeout(() => {
      setModules(prev => prev.map(module => ({
        ...module,
        packetsWaiting: Math.floor(module.packetsWaiting * 0.7),
        reputation: Math.min(5, module.reputation + (Math.random() > 0.7 ? 0.5 : 0))
      })));
      
      setBalancing(false);
    }, 3000);
  };

  // Registrar módulo en blockchain
  const handleRegisterModule = async (moduleId: string) => {
    setRegistering(moduleId);
    try {
      await registerModule(moduleId);
      const newState = await getModuleState(moduleId);
      setBlockchainStates(prev => ({
        ...prev,
        [moduleId]: newState
      }));
      toast.success("Módulo registrado exitosamente");
    } catch (err) {
      console.error("Error registering module:", err);
      toast.error("Error al registrar módulo");
    } finally {
      setRegistering(null);
    }
  };

  return (
    <Layout module="qindex">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Qindex - Panel de Control</h1>
          <Button 
            onClick={handleBalanceLoad}
            disabled={balancing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {balancing ? 'Balanceando...' : 'Balancear Carga'}
          </Button>
        </div>
        
        <QindexStats modules={modules} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(module => (
            <ModuleStatusCard 
              key={module.id}
              module={module}
              onRevalidate={handleRevalidate}
              validating={validating}
              blockchainState={blockchainStates[module.id]}
              onRegister={() => handleRegisterModule(module.id)}
              registering={registering === module.id}
            />
          ))}
        </div>
        
        <div className="mt-8 border rounded-lg p-4 bg-background/50">
          <h2 className="text-lg font-medium mb-2">TODOs de integración</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>TODO: Integrar contratos inteligentes de reputación basados en prueba de actividad.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>TODO: Implementar decisiones de balanceo basadas en identidad verificada (sQuid).</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>TODO: Desarrollar análisis en tiempo real de nodos activos y métricas de performance.</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
