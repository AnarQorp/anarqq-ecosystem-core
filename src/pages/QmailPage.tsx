import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Send, 
  Archive, 
  Shield, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Code
} from 'lucide-react';
import { Layout } from '@/components/common/Layout';
import { ComposeEncrypted } from '@/components/qmail/ComposeEncrypted';
import { QmailBlockchainRegister } from '@/components/qmail/QmailBlockchainRegister';
import { DeveloperGuide } from '@/components/developer/DeveloperGuide';
import { MessageItem } from '@/components/qmail/MessageItem';
import { MessageViewer } from '@/components/qmail/MessageViewer';
import { fetchInboxMessages, convertToMessage } from '@/lib/qmail/fetchInbox';
import { decryptMessageFromIPFS, DecryptedMessageContent } from '@/lib/qmail/messageDecryption';
import { getActiveIdentity } from '@/state/identity';
import { Message, Identity, MessageStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

// Define MessageFormData interface for compatibility
interface MessageFormData {
  recipientId: string;
  subject: string;
  content: string;
  priority?: string;
  metadata?: any;
}

export default function QmailPage() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedDecryptedContent, setSelectedDecryptedContent] = useState<DecryptedMessageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [identities] = useState<Identity[]>([]);
  const [activeSenderId, setActiveSenderId] = useState('');
  
  // Nuevos estados para integración completa
  const [showDeveloperGuide, setShowDeveloperGuide] = useState(false);
  const [composeStep, setComposeStep] = useState<'compose' | 'blockchain' | 'complete'>('compose');
  const [encryptedMessageData, setEncryptedMessageData] = useState<any>(null);

  // Cargar mensajes al montar el componente
  useEffect(() => {
    loadInboxMessages();
  }, []);

  /**
   * Carga mensajes del inbox usando la nueva función modular
   */
  const loadInboxMessages = async () => {
    try {
      setLoading(true);
      
      const activeIdentity = getActiveIdentity();
      if (!activeIdentity) {
        toast({
          title: "Error de autenticación",
          description: "No hay identidad sQuid activa. Por favor inicia sesión.",
          variant: "destructive"
        });
        return;
      }

      console.log(`[QMail Page] Cargando mensajes para DID: ${activeIdentity.did.slice(0, 16)}...`);

      // Usar la nueva función modular de fetchInbox
      const inboxMessages = await fetchInboxMessages();
      
      // Convertir a formato Message para compatibilidad
      const convertedMessages = inboxMessages.map(convertToMessage);
      
      setMessages(convertedMessages);
      console.log(`[QMail Page] ✅ Cargados ${convertedMessages.length} mensajes`);

      // Mostrar estadísticas
      const verified = inboxMessages.filter(m => m.verified).length;
      const unverified = inboxMessages.length - verified;
      
      if (unverified > 0) {
        toast({
          title: "Mensajes verificados",
          description: `${verified} mensajes verificados, ${unverified} con problemas de verificación`,
          variant: unverified > 0 ? "destructive" : "default"
        });
      }

    } catch (error) {
      console.error('[QMail Page] Error cargando mensajes:', error);
      toast({
        title: "Error al cargar mensajes",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el descifrado de un mensaje seleccionado
   */
  const handleMessageDecrypted = (content: DecryptedMessageContent) => {
    setSelectedDecryptedContent(content);
    console.log(`[QMail Page] Mensaje descifrado: ${content.subject}`);
  };

  /**
   * Maneja la selección de un mensaje y resetea el contenido descifrado
   */
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    setSelectedDecryptedContent(null); // Reset decrypted content when selecting new message
  };

  /**
   * Maneja el envío de mensajes (compatibilidad con ComposeForm existente)
   */
  const handleSendMessage = async (formData: MessageFormData) => {
    try {
      console.log('[QMail Page] Mensaje enviado, recargando inbox...');
      
      // Recargar mensajes después del envío
      await loadInboxMessages();
      
      // Cambiar a la pestaña de inbox
      setActiveTab('inbox');
      
    } catch (error) {
      console.error('[QMail Page] Error después del envío:', error);
    }
  };

  /**
   * Guarda borrador (funcionalidad existente)
   */
  const handleSaveDraft = (formData: MessageFormData) => {
    console.log('[QMail Page] Guardando borrador:', formData);
    toast({
      title: "Borrador guardado",
      description: "Tu mensaje ha sido guardado como borrador.",
    });
  };

  /**
   * Maneja el mensaje cifrado desde ComposeEncrypted
   */
  const handleMessageEncrypted = (data: any) => {
    setEncryptedMessageData(data);
    setComposeStep('blockchain');
    console.log('[QMail Integration] Mensaje cifrado, pasando a registro blockchain');
  };

  /**
   * Maneja el registro blockchain completado
   */
  const handleBlockchainRegistrationComplete = (registration: any) => {
    console.log('[QMail Integration] Registro blockchain completado:', registration);
    
    toast({
      title: "Mensaje enviado exitosamente",
      description: `Cifrado, almacenado en IPFS y ${registration.productionTx || registration.testnetTx ? 'registrado en blockchain' : 'listo'}`,
    });

    // Recargar mensajes y volver al inbox
    loadInboxMessages();
    setActiveTab('inbox');
    setComposeStep('compose');
    setEncryptedMessageData(null);
  };

  /**
   * Resetea el flujo de composición
   */
  const handleResetCompose = () => {
    setComposeStep('compose');
    setEncryptedMessageData(null);
  };

  /**
   * Estadísticas del inbox
   */
  const getInboxStats = () => {
    const total = messages.length;
    const unread = messages.filter(m => m.status === MessageStatus.UNREAD).length;
    const verified = messages.filter(m => m.metadata.qerberosValidated).length;
    const encrypted = messages.filter(m => m.metadata.encryptedWith === 'QLOCK').length;
    
    return { total, unread, verified, encrypted };
  };

  const stats = getInboxStats();
  const activeIdentity = getActiveIdentity();

  // Si no hay identidad activa, mostrar mensaje de error
  if (!activeIdentity) {
    return (
      <Layout module="qmail">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Identidad requerida</h2>
              <p className="text-muted-foreground mb-4">
                Necesitas una identidad sQuid activa para usar QMail.
              </p>
              <Button onClick={() => window.location.href = '/squid-login'}>
                Iniciar sesión con sQuid
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout module="qmail">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header con información de identidad */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-6 w-6" />
                  QMail - Mensajería Segura
                </CardTitle>
                <CardDescription>
                  Mensajes cifrados con Qlock, indexados con Qindex, verificados con Qerberos y registro blockchain opcional
                </CardDescription>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Identidad activa</p>
                  <p className="font-mono text-sm">
                    {activeIdentity.did.slice(0, 20)}...
                  </p>
                  <Badge variant="outline">
                    {activeIdentity.type} • {activeIdentity.space}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeveloperGuide(!showDeveloperGuide)}
                >
                  <Code className="mr-1 h-3 w-3" />
                  Guía Dev
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Guía para desarrolladores (colapsible) */}
        {showDeveloperGuide && (
          <div className="mb-6">
            <DeveloperGuide />
          </div>
        )}

        {/* Estadísticas del inbox */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total mensajes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-xs text-muted-foreground">No leídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                  <p className="text-xs text-muted-foreground">Verificados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.encrypted}</p>
                  <p className="text-xs text-muted-foreground">Cifrados Qlock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interfaz principal */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox" className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              Inbox ({stats.unread})
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center">
              <Send className="mr-2 h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Bandeja de entrada</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadInboxMessages}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Cargando...' : 'Actualizar'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Cargando mensajes...</p>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Lista de mensajes */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {messages.map(message => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          onClick={() => handleMessageSelect(message)}
                          selected={selectedMessage?.id === message.id}
                        />
                      ))}
                    </div>
                    
                    {/* Vista del mensaje seleccionado con descifrado */}
                    <div className="border-l pl-4">
                      {selectedMessage ? (
                        <MessageViewer
                          message={selectedMessage}
                          decryptedContent={selectedDecryptedContent}
                          onDecrypted={handleMessageDecrypted}
                          // Note: The encryption key should be provided here if available
                          // For now, we're passing an empty string as a placeholder
                          // In a real implementation, you would get this from the user's session or keychain
                          encryptionKey=""
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                          <p>Selecciona un mensaje para verlo</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>No hay mensajes en tu bandeja de entrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compose">
            <div className="space-y-6">
              {composeStep === 'compose' && (
                <ComposeEncrypted
                  onMessageEncrypted={handleMessageEncrypted}
                />
              )}
              
              {composeStep === 'blockchain' && encryptedMessageData && (
                <div className="space-y-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">
                          Mensaje cifrado y almacenado en IPFS exitosamente
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        IPFS Hash: {encryptedMessageData.ipfsHash.slice(0, 20)}...
                      </p>
                    </CardContent>
                  </Card>
                  
                  <QmailBlockchainRegister
                    ipfsHash={encryptedMessageData.ipfsHash}
                    messageContent={encryptedMessageData.encryptedContent}
                    fileHash={encryptedMessageData.fileHash}
                    onRegistrationComplete={handleBlockchainRegistrationComplete}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleResetCompose}>
                      Volver
                    </Button>
                    <Button onClick={() => handleBlockchainRegistrationComplete({})}>
                      Omitir blockchain y finalizar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="archive">
            <Card>
              <CardHeader>
                <CardTitle>Archivo</CardTitle>
                <CardDescription>
                  Mensajes archivados y histórico de comunicaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Funcionalidad de archivo próximamente</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
