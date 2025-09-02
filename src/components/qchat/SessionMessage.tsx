
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  MessageSquare,
  Clock
} from 'lucide-react';
import { SessionMessage as SessionMessageType } from '@/utils/qchat/qchatSessionBridge';

interface SessionMessageProps {
  message: SessionMessageType;
  onViewDetails?: (message: SessionMessageType) => void;
}

export default function SessionMessage({ message, onViewDetails }: SessionMessageProps) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(message);
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
      <CardContent className="p-4">
        {/* Header del mensaje */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-800">
              {message.alias || message.sender}
            </span>
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              <ExternalLink className="h-3 w-3 mr-1" />
              Session
            </Badge>
            
            {/* Estado de verificación */}
            {message.verified ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verificado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No verificado
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.timestamp)}</span>
          </div>
        </div>

        {/* Contenido del mensaje */}
        <div className="mb-3">
          <p className="text-gray-800 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Footer con información adicional */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>ID: {message.id.slice(0, 8)}...</span>
            </div>
            <div>
              <span>Grupo: {message.sessionGroupId}</span>
            </div>
            {message.alias && (
              <div>
                <span>Alias: @{message.alias}</span>
              </div>
            )}
          </div>
          
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Detalles
            </Button>
          )}
        </div>

        {/* Advertencia de seguridad para mensajes no verificados */}
        {!message.verified && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
            <div className="flex items-center space-x-1 text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              <span>
                Este mensaje externo no ha sido verificado con las claves del ecosistema sQuid
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
