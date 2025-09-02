
import { Layout } from '@/components/common/Layout';
import { ModuleCard } from '@/components/common/ModuleCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAlgorithms } from '@/api/qlock';

const ENCRYPTION_LEVELS = {
  basic: {
    name: "Básico",
    time: "1 hora",
    description: "Cifrado estándar AES-256"
  },
  intermediate: {
    name: "Intermedio",
    time: "24 horas",
    description: "Cifrado avanzado multicapa"
  },
  quantum: {
    name: "Cuántico",
    time: "7 días",
    description: "Protección cuántica resistente"
  }
};

export default function Qlock() {
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<keyof typeof ENCRYPTION_LEVELS>("basic");
  const [isSecure, setIsSecure] = useState(false);

  useEffect(() => {
    // TODO: Integrate with real quantum encryption service
    getAlgorithms().then(response => {
      setAlgorithms(response.algorithms);
    });
  }, []);

  const handleActivateSecurity = () => {
    if (password.length < 8) return;
    
    // TODO: Integrate with Rust/Web3 encryption engine
    // TODO: Connect with decentralized wallet
    // TODO: Connect with Qlock network validators
    
    setIsSecure(true);
  };

  return (
    <Layout module="qlock">
      <div className="max-w-2xl mx-auto space-y-8">
        {!isSecure ? (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="flex items-center gap-2 text-violet-600">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Desbloqueo Seguro</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña de seguridad</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Nivel de cifrado</Label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(ENCRYPTION_LEVELS).map(([key, value]) => (
                    <Button
                      key={key}
                      variant={selectedLevel === key ? "default" : "outline"}
                      onClick={() => setSelectedLevel(key as keyof typeof ENCRYPTION_LEVELS)}
                      className="w-full"
                    >
                      {value.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleActivateSecurity}
                disabled={password.length < 8}
                className="w-full"
              >
                <Shield className="mr-2 h-4 w-4" />
                Activar Seguridad
              </Button>
            </div>
          </div>
        ) : (
          <ModuleCard
            moduleId="qlock"
            isActive={true}
            className="w-full"
          >
            <div className="flex items-center gap-2 text-green-500 mb-4">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Sesión protegida con Qlock</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Nivel de cifrado:</span> {ENCRYPTION_LEVELS[selectedLevel].name}</p>
              <p><span className="font-medium">Tiempo de bloqueo:</span> {ENCRYPTION_LEVELS[selectedLevel].time}</p>
              <p className="text-muted-foreground">{ENCRYPTION_LEVELS[selectedLevel].description}</p>
            </div>
          </ModuleCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {algorithms.map((algo) => (
            <ModuleCard
              key={algo.id}
              moduleId="qlock"
              isActive={algo.quantumResistant}
              showDescription={true}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
