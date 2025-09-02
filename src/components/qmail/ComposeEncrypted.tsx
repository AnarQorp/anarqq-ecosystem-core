import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Lock, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Loader2 
} from 'lucide-react';
import { getActiveIdentity } from '@/state/identity';
import { encryptFile } from '@/lib/qlock';
import { uploadToIPFS } from '@/utils/ipfs';
import { toast } from '@/hooks/use-toast';
import { useSessionContext } from '@/contexts/SessionContext';

// Esquema de validación
const composeSchema = z.object({
  recipientId: z.string().min(1, 'Destinatario requerido'),
  subject: z.string().min(1, 'Asunto requerido'),
  content: z.string().min(1, 'Contenido requerido'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
});

type ComposeFormData = z.infer<typeof composeSchema>;

interface ComposeEncryptedProps {
  onMessageEncrypted: (data: {
    encryptedContent: string;
    ipfsHash: string;
    fileHash: string;
    messageData: ComposeFormData;
  }) => void;
  /** Contenido predefinido para el campo de mensaje */
  prefillContent?: string;
  /** Asunto predefinido */
  defaultSubject?: string;
}

export function ComposeEncrypted({ 
  onMessageEncrypted, 
  prefillContent: propPrefillContent, 
  defaultSubject: propDefaultSubject 
}: ComposeEncryptedProps) {
  const [searchParams] = useSearchParams();
  // Obtener contenido de la URL si está presente
  const urlContent = searchParams.get('content');
  // Prioridad: 1. props.prefillContent 2. URL content 3. cadena vacía
  const prefillContent = propPrefillContent || urlContent || '';
  // Prioridad: 1. props.defaultSubject 2. URL subject 3. undefined
  const defaultSubject = propDefaultSubject || searchParams.get('subject') || undefined;
  const [isEncrypting, setIsEncrypting] = useState(false);
  const { cid_profile } = useSessionContext();
  
  const form = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      recipientId: searchParams.get('to') || '',
      subject: defaultSubject || '',
      content: prefillContent,
      priority: (searchParams.get('priority') as 'LOW' | 'NORMAL' | 'HIGH') || 'NORMAL',
    },
  });

  // Actualizar el contenido si cambia la prop o la URL
  useEffect(() => {
    if (prefillContent && !form.getValues('content')) {
      form.setValue('content', prefillContent);
    }
    if (defaultSubject && !form.getValues('subject')) {
      form.setValue('subject', defaultSubject);
    }
  }, [prefillContent, defaultSubject, form]);

  const activeIdentity = getActiveIdentity();

  /**
   * Maneja el cifrado y almacenamiento del mensaje
   */
  const handleEncryptAndSend = async (data: ComposeFormData) => {
    if (!activeIdentity) {
      toast({
        title: "Error de autenticación",
        description: "No hay identidad activa para cifrar el mensaje",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsEncrypting(true);
      console.log('[ComposeEncrypted] Iniciando cifrado del mensaje...');

      // Crear el contenido completo del mensaje
      const messageContent = {
        to: data.recipientId,
        from: activeIdentity.did,
        subject: data.subject,
        content: data.content,
        priority: data.priority,
        timestamp: new Date().toISOString(),
        space: activeIdentity.space,
        // Incluir el cid_profile del remitente si está disponible
        ...(cid_profile && { cid_profile }),
      };

      const messageString = JSON.stringify(messageContent, null, 2);
      
      // Cifrar con Qlock usando la función correcta
      console.log('[ComposeEncrypted] Cifrando con Qlock...');
      let encryptedBlob: Blob;
      let fileHash: string;
      try {
        // Crear un archivo apropiado para cifrar
        const messageBlob = new Blob([messageString], { type: 'application/json' });
        const messageFile = new File([messageBlob], 'message.json', { type: 'application/json' });
        
        console.log('[ComposeEncrypted] Archivo creado, tamaño:', messageFile.size);
        const encryptResult = await encryptFile(messageFile);
        encryptedBlob = encryptResult.encryptedBlob;
        fileHash = encryptResult.fileHash;
        console.log('[ComposeEncrypted] Cifrado completado, hash:', fileHash);
      } catch (error) {
        console.error('[ComposeEncrypted] Error en cifrado:', error);
        throw new Error(`Error de cifrado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }

      // Subir a IPFS
      console.log('[ComposeEncrypted] Subiendo a IPFS...');
      let ipfsHash: string;
      try {
        // Crear archivo con nombre único para IPFS
        const encryptedFile = new File([encryptedBlob], `qmail-${Date.now()}.enc`, { type: 'application/octet-stream' });
        console.log('[ComposeEncrypted] Archivo para IPFS creado, tamaño:', encryptedFile.size);
        ipfsHash = await uploadToIPFS(encryptedFile);
        console.log('[ComposeEncrypted] IPFS upload completado:', ipfsHash);
      } catch (error) {
        console.error('[ComposeEncrypted] Error en IPFS:', error);
        throw new Error(`Error IPFS: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }

      // Convertir el blob cifrado a string para el flujo de datos
      const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();
      const encryptedString = btoa(String.fromCharCode(...new Uint8Array(encryptedArrayBuffer)));

      console.log(`[ComposeEncrypted] ✅ Mensaje procesado exitosamente:
        - IPFS Hash: ${ipfsHash}
        - File Hash: ${fileHash}
        - Cifrado: Qlock (AES-256)
        - Tamaño cifrado: ${encryptedBlob.size} bytes`);

      toast({
        title: "Mensaje cifrado exitosamente",
        description: `Almacenado en IPFS: ${ipfsHash.slice(0, 20)}...`,
      });

      // Pasar al siguiente paso
      onMessageEncrypted({
        encryptedContent: encryptedString,
        ipfsHash,
        fileHash,
        messageData: data,
      });

    } catch (error) {
      console.error('[ComposeEncrypted] Error:', error);
      toast({
        title: "Error al procesar mensaje",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  if (!activeIdentity) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Identidad requerida</h3>
          <p className="text-muted-foreground">
            Necesitas una identidad sQuid activa para enviar mensajes cifrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del compositor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="mr-2 h-5 w-5" />
            Compositor de Mensajes Cifrados
          </CardTitle>
          <CardDescription>
            Los mensajes se cifran con Qlock, se almacenan en IPFS y opcionalmente se registran en blockchain
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Información de la identidad emisora */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Identidad emisora</span>
              </div>
              <p className="text-blue-700 font-mono text-sm">
                {activeIdentity.name}@qmail.anarq
              </p>
              <p className="text-blue-600 text-xs">
                DID: {activeIdentity.did.slice(0, 20)}...
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {activeIdentity.space}
              </Badge>
              {activeIdentity.kyc && (
                <Badge variant="default" className="ml-2 bg-green-500">
                  Verificado
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de composición */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-4 w-4" />
            Mensaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEncryptAndSend)} className="space-y-4">
              {/* Destinatario */}
              <FormField
                control={form.control}
                name="recipientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinatario</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="usuario@qmail.anarq o DID del destinatario"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Asunto */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Asunto del mensaje"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridad */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Baja</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contenido */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Escribe tu mensaje aquí..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Información de seguridad */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Cifrado cuántico con Qlock (AES-256)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Almacenamiento descentralizado en IPFS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Verificación de integridad con Qerberos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Registro blockchain opcional</span>
                </div>
              </div>

              {/* Botón de envío */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isEncrypting}
              >
                {isEncrypting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cifrando y almacenando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Cifrar y continuar
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
