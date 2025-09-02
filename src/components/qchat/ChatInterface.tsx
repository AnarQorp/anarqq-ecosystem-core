
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Send, User, Lock, Cloud, CheckCircle, AlertCircle, MessageCircle, Users } from 'lucide-react';
import { SquidIdentity } from '@/state/identity';
import { toast } from '@/hooks/use-toast';
import { sendQchatMessage, getQchatHistory, type QchatMessage } from '@/utils/qchat/qchatMessaging';
import { sendTestMessage } from '@/utils/qchat/qchatCore';
import UserSearch from './UserSearch';

interface ChatInterfaceProps {
  activeIdentity: SquidIdentity;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeIdentity }) => {
  const [messages, setMessages] = useState<QchatMessage[]>([]);
  const [recipientDID, setRecipientDID] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [saveToIPFS, setSaveToIPFS] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial de mensajes
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getQchatHistory(activeIdentity.did);
        setMessages(history);
      } catch (error) {
        console.error('[Qchat] Error cargando historial:', error);
      }
    };

    loadHistory();
  }, [activeIdentity.did]);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartConversation = (userDID: string, userName: string) => {
    setRecipientDID(userDID);
    setRecipientName(userName);
    setShowUserSearch(false);
    
    // Filter messages for this conversation
    const conversationMessages = messages.filter(msg => 
      (msg.senderDID === activeIdentity.did && msg.recipientDID === userDID) ||
      (msg.senderDID === userDID && msg.recipientDID === activeIdentity.did)
    );
    
    console.log(`[Qchat] Conversación iniciada con ${userName} (${userDID.slice(0, 16)}...)`);
    console.log(`[Qchat] ${conversationMessages.length} mensajes anteriores encontrados`);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !recipientDID.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el destinatario y el mensaje",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`[Qchat] Enviando mensaje de ${activeIdentity.did.slice(0, 16)}... a ${recipientDID.slice(0, 16)}...`);
      
      const sentMessage = await sendQchatMessage({
        senderDID: activeIdentity.did,
        recipientDID,
        content: messageContent,
        saveToIPFS,
        senderName: activeIdentity.name
      });

      // Agregar mensaje al historial
      setMessages(prev => [...prev, sentMessage]);

      // Limpiar formulario
      setMessageContent('');
      
      toast({
        title: "Mensaje enviado",
        description: `Mensaje cifrado y ${saveToIPFS ? 'guardado en IPFS' : 'enviado'} exitosamente`,
      });

    } catch (error) {
      console.error('[Qchat] Error enviando mensaje:', error);
      toast({
        title: "Error al enviar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = async () => {
    try {
      await sendTestMessage(activeIdentity.did);
      toast({
        title: "Test completado",
        description: "Verifica la consola para los logs de prueba",
      });
    } catch (error) {
      console.error('[Qchat] Error en test:', error);
      toast({
        title: "Error en test",
        description: "Error durante la prueba del flujo",
        variant: "destructive"
      });
    }
  };

  // Filter messages for current conversation
  const currentConversationMessages = recipientDID 
    ? messages.filter(msg => 
        (msg.senderDID === activeIdentity.did && msg.recipientDID === recipientDID) ||
        (msg.senderDID === recipientDID && msg.recipientDID === activeIdentity.did)
      )
    : messages;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel de chat */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {recipientName ? `Chat con ${recipientName}` : 'Conversación'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                {showUserSearch ? 'Cerrar' : 'Buscar Usuarios'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestMessage}
                className="text-xs"
              >
                Test Debug
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* User search */}
          {showUserSearch && (
            <div className="mb-4 p-4 border rounded-lg bg-slate-50">
              <UserSearch
                onStartConversation={handleStartConversation}
                currentUserDID={activeIdentity.did}
              />
            </div>
          )}

          {/* Current conversation info */}
          {recipientDID && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Conversación con {recipientName || 'Usuario'}
                  </p>
                  <p className="text-xs text-blue-700">
                    DID: {recipientDID.slice(0, 24)}...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecipientDID('');
                    setRecipientName('');
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-slate-50">
            {currentConversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay mensajes aún</p>
                  <p className="text-sm">
                    {recipientDID ? 'Envía tu primer mensaje en esta conversación' : 'Busca un usuario para iniciar una conversación'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentConversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderDID === activeIdentity.did ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderDID === activeIdentity.did
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {message.senderName || message.senderDID.slice(0, 12)}...
                        </span>
                        {message.verified && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Lock className="h-3 w-3 opacity-50" />
                        {message.ipfsHash && (
                          <Cloud className="h-3 w-3 text-purple-500" />
                        )}
                        <span className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Formulario de envío */}
          <div className="space-y-3">
            {!recipientDID && (
              <div>
                <Label htmlFor="recipient">DID del destinatario</Label>
                <Input
                  id="recipient"
                  placeholder="did:key:z... o busca un usuario arriba"
                  value={recipientDID}
                  onChange={(e) => setRecipientDID(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe tu mensaje cifrado..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveToIPFS"
                  checked={saveToIPFS}
                  onCheckedChange={(checked) => setSaveToIPFS(checked as boolean)}
                />
                <Label htmlFor="saveToIPFS" className="text-sm">
                  Guardar en IPFS
                </Label>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !messageContent.trim() || !recipientDID.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de información */}
      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información de identidad */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Identidad Activa</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Nombre:</strong> {activeIdentity.name}</p>
              <p><strong>Tipo:</strong> {activeIdentity.type}</p>
              <p><strong>DID:</strong> {activeIdentity.did.slice(0, 20)}...</p>
              <p><strong>Espacio:</strong> {activeIdentity.space}</p>
            </div>
          </div>

          {/* Estado de módulos */}
          <div className="space-y-2">
            <h4 className="font-medium">Módulos Integrados</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cifrado Qlock</span>
                <Badge variant="default">Activo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Registro Qindex</span>
                <Badge variant="default">Activo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Verificación Qerberos</span>
                <Badge variant="default">Activo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Almacenamiento IPFS</span>
                <Badge variant="secondary">Opcional</Badge>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Estadísticas</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Mensajes enviados:</strong> {messages.filter(m => m.senderDID === activeIdentity.did).length}</p>
              <p><strong>Mensajes recibidos:</strong> {messages.filter(m => m.senderDID !== activeIdentity.did).length}</p>
              <p><strong>Total conversaciones:</strong> {new Set(messages.map(m => m.senderDID === activeIdentity.did ? m.recipientDID : m.senderDID)).size}</p>
            </div>
          </div>

          {/* Estado de puentes */}
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Puentes Externos
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Telegram: No configurado</p>
              <p>• Discord: No configurado</p>
              <p className="text-xs mt-2">
                Configura en la pestaña de Configuración
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;
