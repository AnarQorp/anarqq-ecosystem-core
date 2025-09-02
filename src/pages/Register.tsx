
/**
 * Página de registro de usuarios sQuid con integración Storacha
 * Sistema de registro descentralizado usando IPFS real + Web3.Storage
 * MODO PRODUCCIÓN: IPFS real siempre activo
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Mail, Lock, ArrowRight, UserPlus, Globe } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { useToast } from '@/hooks/use-toast';
import { registerUser, checkAliasAvailability } from '@/utils/squid/squidAuthService';

export default function Register() {
  const navigate = useNavigate();
  const { setActiveIdentity } = useIdentityStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    alias: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [aliasChecking, setAliasChecking] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'alias' && value.length >= 3) {
      checkAlias(value);
    } else if (field === 'alias') {
      setAliasAvailable(null);
    }
  };

  const checkAlias = async (alias: string) => {
    setAliasChecking(true);
    try {
      const available = await checkAliasAvailability(alias);
      setAliasAvailable(available);
    } catch (error) {
      console.error('Error verificando alias:', error);
      setAliasAvailable(null);
    } finally {
      setAliasChecking(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.alias.trim()) {
      newErrors.alias = 'El alias es requerido';
    } else if (formData.alias.length < 3) {
      newErrors.alias = 'El alias debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.alias)) {
      newErrors.alias = 'El alias solo puede contener letras, números, guiones y guiones bajos';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    if (aliasAvailable === false) {
      toast({
        title: "Error",
        description: "El alias no está disponible",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);

    try {
      console.log('[Register] Iniciando registro...');
      const result = await registerUser({
        alias: formData.alias,
        email: formData.email,
        password: formData.password
      });
      
      if (result.success && result.identity) {
        setActiveIdentity(result.identity);
        
        toast({
          title: "¡Registro exitoso!",
          description: `Bienvenido al ecosistema AnarQ&Q, ${result.identity.name}`,
        });

        // Mostrar información del espacio creado
        console.log(`[Register] Espacio Storacha creado: ${result.spaceDID}`);
        console.log(`[Register] Agent DID: ${result.agentDID}`);
        
        toast({
          title: "Espacio IPFS creado",
          description: `Tu espacio descentralizado está listo: ${result.spaceDID?.slice(0, 20)}...`,
        });
        
        navigate('/home');
        
      } else {
        // Handle the case where success is false or no identity
        const errorMessage = 'success' in result && !result.success && 'error' in result 
          ? (result as any).error 
          : "Error desconocido en el registro";
          
        toast({
          title: "Error en el registro",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Register] Error:', error);
      toast({
        title: "Error de registro",
        description: `No fue posible completar el registro: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getAliasStatus = () => {
    if (!formData.alias || formData.alias.length < 3) return null;
    
    if (aliasChecking) {
      return <span className="text-xs text-gray-500">Verificando...</span>;
    }
    
    if (aliasAvailable === true) {
      return <span className="text-xs text-green-600">✓ Alias disponible</span>;
    }
    
    if (aliasAvailable === false) {
      return <span className="text-xs text-red-600">✗ Alias no disponible</span>;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <Shield className="h-12 w-12 text-purple-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">sQuid</h1>
          </div>
          <p className="text-slate-300">Crear nueva identidad descentralizada</p>
          <div className="flex items-center justify-center gap-2 text-xs text-purple-300">
            <Globe className="h-4 w-4" />
            <span>Powered by Storacha (Web3.Storage)</span>
          </div>
        </div>

        {/* Formulario de registro */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Registro IPFS Descentralizado
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tu identidad y espacio se crearán automáticamente en la red descentralizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alias */}
            <div className="space-y-2">
              <Label htmlFor="alias" className="text-slate-300">Alias de usuario</Label>
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="alias"
                    type="text"
                    placeholder="tu_alias_unico"
                    value={formData.alias}
                    onChange={(e) => handleInputChange('alias', e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                    disabled={isRegistering}
                  />
                </div>
                {getAliasStatus()}
                {errors.alias && (
                  <p className="text-xs text-red-400">{errors.alias}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  disabled={isRegistering}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  disabled={isRegistering}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  disabled={isRegistering}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Información de Storacha */}
            <Alert className="bg-slate-700 border-slate-600">
              <Globe className="h-4 w-4" />
              <AlertDescription className="text-slate-300 text-sm">
                <strong>Registro descentralizado:</strong><br/>
                • Se creará tu espacio personal en Storacha<br/>
                • Tu identidad será cifrada y almacenada en IPFS<br/>
                • Acceso 100% descentralizado sin servidores centrales<br/>
                • Sistema de producción con IPFS real activo
              </AlertDescription>
            </Alert>

            {/* Botón de registro */}
            <Button 
              onClick={handleRegister}
              disabled={isRegistering || aliasChecking || aliasAvailable === false}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isRegistering ? (
                'Creando espacio en Storacha...'
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Crear identidad sQuid
                </>
              )}
            </Button>

            {/* Link a login */}
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                ¿Ya tienes una cuenta?{' '}
                <Link 
                  to="/login" 
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          <p>Sistema de identidades descentralizadas sQuid</p>
          <p>Ecosistema AnarQ&Q - Privacidad y Soberanía Digital</p>
          <p className="text-purple-400 mt-1">Powered by Storacha & IPFS</p>
          <p className="text-green-400 mt-1">🟢 Modo Producción Activo</p>
        </div>
      </div>
    </div>
  );
}
