
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Settings, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { toast } from '@/hooks/use-toast';
import ChatInterface from '@/components/qchat/ChatInterface';
import QchatSettings from '@/components/qchat/QchatSettings';
import SessionMessage from '@/components/qchat/SessionMessage';
import { initializeQchat } from '@/utils/qchat/qchatCore';
import { 
  getSessionBridgeSettings, 
  startSessionBridge,
  type SessionMessage as SessionMessageType 
} from '@/utils/qchat/qchatSessionBridge';

const Qchat = () => {
  const navigate = useNavigate();
  const { activeIdentity, isAuthenticated } = useIdentityStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<SessionMessageType[]>([]);
  const [showSessionMessages, setShowSessionMessages] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthenticated || !activeIdentity) {
      toast({
        title: "Acceso denegado",
        description: "Necesitas iniciar sesión con sQuid para acceder a Qchat",
        variant: "destructive"
      });
      navigate('/entry');
      return;
    }

    // Inicializar Qchat
    const initQchat = async () => {
      try {
        await initializeQchat(activeIdentity.did);
        setIsInitialized(true);
        console.log(`[Qchat] Módulo inicializado para identidad: ${activeIdentity.did.slice(0, 16)}...`);
        
        // Verificar si hay configuración de Session Bridge
        const sessionConfig = getSessionBridgeSettings(activeIdentity.did);
        if (sessionConfig?.enabled) {
          console.log('[Qchat] Session Bridge configurado, iniciando...');
          try {
            await startSessionBridge();
            setShowSessionMessages(true);
          } catch (error) {
            console.warn('[Qchat] Error iniciando Session Bridge:', error);
          }
        }
      } catch (error) {
        console.error('[Qchat] Error inicializando módulo:', error);
        toast({
          title: "Error de inicialización",
          description: "No se pudo inicializar Qchat correctamente",
          variant: "destructive"
        });
      }
    };

    initQchat();
  }, [isAuthenticated, activeIdentity, navigate]);

  // Escuchar mensajes de Session
  useEffect(() => {
    const handleSessionMessage = (event: CustomEvent<SessionMessageType>) => {
      const newMessage = event.detail;
      setSessionMessages(prev => [newMessage, ...prev.slice(0, 99)]); // Mantener solo 100 mensajes
      
      // Mostrar notificación
      toast({
        title: "Nuevo mensaje de Session",
        description: `${newMessage.sender}: ${newMessage.content.slice(0, 50)}...`,
      });
    };

    window.addEventListener('qchat:session-message', handleSessionMessage as EventListener);
    
    return () => {
      window.removeEventListener('qchat:session-message', handleSessionMessage as EventListener);
    };
  }, []);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleViewMessageDetails = (message: SessionMessageType) => {
    // Abrir modal o panel con detalles del mensaje
    console.log('[Qchat] Ver detalles del mensaje:', message);
    toast({
      title: "Detalles del mensaje",
      description: `Mensaje de ${message.sender} desde Session group ${message.sessionGroupId}`,
    });
  };

  if (!isAuthenticated || !activeIdentity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Acceso Requerido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Necesitas una identidad sQuid activa para acceder a Qchat.
            </p>
            <Button onClick={() => navigate('/entry')} className="w-full">
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500 animate-pulse" />
              Inicializando Qchat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-center text-muted-foreground">
              Configurando módulo de mensajería cifrada...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                  Qchat
                </h1>
                <p className="text-slate-600">
                  Mensajería cifrada descentralizada
                  {showSessionMessages && (
                    <span className="ml-2 text-purple-600">
                      + Session Bridge activo
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
                {sessionMessages.length > 0 && (
                  <span className="ml-1 bg-purple-500 text-white text-xs rounded-full px-1">
                    {sessionMessages.length}
                  </span>
                )}
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configuración
              </Button>
            </div>
          </div>
        </div>

        {/* Información de identidad activa */}
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Identidad activa:</strong> {activeIdentity.name} ({activeIdentity.type})
              </div>
              <div className="text-sm text-muted-foreground">
                DID: {activeIdentity.did.slice(0, 20)}...
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Contenido principal */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'chat' ? (
            <div className="space-y-6">
              {/* Mensajes de Session si están habilitados */}
              {showSessionMessages && sessionMessages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-purple-600" />
                      Mensajes de Session ({sessionMessages.length})
                    </CardTitle>
                    <CardDescription>
                      Mensajes recientes del puente Session - Red Oxen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sessionMessages.map(message => (
                        <SessionMessage
                          key={message.id}
                          message={message}
                          onViewDetails={handleViewMessageDetails}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Interfaz de chat principal */}
              <ChatInterface activeIdentity={activeIdentity} />
            </div>
          ) : (
            <QchatSettings activeIdentity={activeIdentity} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Qchat;
