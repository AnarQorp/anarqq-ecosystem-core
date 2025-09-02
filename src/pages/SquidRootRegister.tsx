
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Mail, Key, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/common/Layout';
import { useIdentityStore } from '@/state/identity';
import { registerRootIdentity } from '@/modules/squid/identityManager';
import { validateEmail, validateAlias } from '@/modules/squid/validators';
import { toast } from '@/hooks/use-toast';

interface FormData {
  alias: string;
  email: string;
}

interface ValidationState {
  alias: { valid: boolean; message: string };
  email: { valid: boolean; message: string };
}

export default function SquidRootRegister() {
  const navigate = useNavigate();
  const { setActiveIdentity } = useIdentityStore();
  
  const [formData, setFormData] = useState<FormData>({
    alias: '',
    email: ''
  });
  
  const [validation, setValidation] = useState<ValidationState>({
    alias: { valid: false, message: '' },
    email: { valid: false, message: '' }
  });
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState<'form' | 'generating' | 'success'>('form');

  /**
   * Maneja cambios en el formulario con validación en tiempo real
   */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real
    if (field === 'alias') {
      const aliasValidation = validateAlias(value);
      setValidation(prev => ({
        ...prev,
        alias: aliasValidation
      }));
    } else if (field === 'email') {
      const emailValidation = validateEmail(value);
      setValidation(prev => ({
        ...prev,
        email: emailValidation
      }));
    }
  };

  /**
   * Maneja el envío del formulario de registro
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación final
    const aliasValidation = validateAlias(formData.alias);
    const emailValidation = validateEmail(formData.email);
    
    setValidation({
      alias: aliasValidation,
      email: emailValidation
    });
    
    if (!aliasValidation.valid || !emailValidation.valid) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor corrige los errores antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsRegistering(true);
      setStep('generating');
      
      console.log('[sQuid Register] Iniciando registro de identidad raíz...');
      
      // Registrar identidad raíz usando el módulo sQuid
      const rootIdentity = await registerRootIdentity(formData.alias, formData.email);
      
      console.log(`[sQuid Register] ✅ Identidad creada: ${rootIdentity.did}`);
      console.log(`[sQuid Register] 📧 Email interno: ${rootIdentity.name}@qmail.anarq`);
      
      // Establecer como identidad activa en el estado global
      setActiveIdentity(rootIdentity);
      
      setStep('success');
      
      toast({
        title: "¡Identidad creada exitosamente!",
        description: `Tu identidad ${rootIdentity.name}@qmail.anarq está lista para usar.`,
      });
      
      // Redirigir al home después de un momento
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error) {
      console.error('[sQuid Register] Error en registro:', error);
      
      toast({
        title: "Error en el registro",
        description: error instanceof Error ? error.message : "Error desconocido durante el registro",
        variant: "destructive"
      });
      
      setStep('form');
    } finally {
      setIsRegistering(false);
    }
  };

  const isFormValid = validation.alias.valid && validation.email.valid;

  return (
    <Layout module="squid">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Registro de Identidad Raíz
          </h1>
          <p className="text-slate-600">
            Crea tu identidad soberana en el ecosistema AnarQ&Q
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          <div className={`flex items-center space-x-2 ${step === 'form' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'form' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {step === 'form' ? <User className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            </div>
            <span className="text-sm font-medium">Datos</span>
          </div>
          
          <div className="w-8 h-px bg-gray-200"></div>
          
          <div className={`flex items-center space-x-2 ${
            step === 'generating' ? 'text-blue-600' : step === 'success' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'generating' ? 'bg-blue-100' : step === 'success' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {step === 'success' ? <CheckCircle className="h-4 w-4" /> : <Key className="h-4 w-4" />}
            </div>
            <span className="text-sm font-medium">Generación</span>
          </div>
          
          <div className="w-8 h-px bg-gray-200"></div>
          
          <div className={`flex items-center space-x-2 ${step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'success' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Completado</span>
          </div>
        </div>

        {/* Main Content */}
        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Información de identidad</CardTitle>
              <CardDescription>
                Completa los datos para generar tu DID y dirección de correo interna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Alias Field */}
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias deseado</Label>
                  <Input
                    id="alias"
                    type="text"
                    placeholder="mi-alias-unico"
                    value={formData.alias}
                    onChange={(e) => handleInputChange('alias', e.target.value)}
                    className={validation.alias.message && !validation.alias.valid ? 'border-red-500' : ''}
                  />
                  {formData.alias && (
                    <div className="flex items-center space-x-2 text-sm">
                      {validation.alias.valid ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">
                            Tu dirección será: <strong>{formData.alias}@qmail.anarq</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">{validation.alias.message}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico externo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu-email@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={validation.email.message && !validation.email.valid ? 'border-red-500' : ''}
                  />
                  {formData.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      {validation.email.valid ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Email válido</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">{validation.email.message}</span>
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se usará para recuperación y notificaciones importantes
                  </p>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!isFormValid || isRegistering}
                >
                  {isRegistering ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generando identidad...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Crear Identidad Raíz</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'generating' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Generando tu identidad</h3>
              <p className="text-muted-foreground mb-4">
                Creando DID, claves criptográficas y espacio de almacenamiento...
              </p>
              <div className="space-y-2 text-sm text-left max-w-md mx-auto">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Generando par de claves</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Creando DID único</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span>Asignando espacio de almacenamiento</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">¡Identidad creada exitosamente!</h3>
              <p className="text-muted-foreground mb-6">
                Tu identidad soberana está lista para usar en todo el ecosistema
              </p>
              
              <div className="space-y-3 mb-6">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Mail className="h-4 w-4 mr-2" />
                  {formData.alias}@qmail.anarq
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Shield className="h-4 w-4 mr-2" />
                  Identidad Raíz Verificada
                </Badge>
              </div>
              
              <Button onClick={() => navigate('/')} className="w-full">
                Ir al Dashboard Principal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Panel */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">¿Qué es una Identidad Raíz?</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Control total sobre tus datos y comunicaciones</li>
                <li>• Acceso a QMail, almacenamiento IPFS y futuras funcionalidades</li>
                <li>• Capacidad para crear subidentidades especializadas (próximamente)</li>
                <li>• Compatibilidad con estándares Web3 e identidad descentralizada</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}
