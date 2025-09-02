import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageEncryption } from './MessageEncryption';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Lock, 
  Send, 
  Save, 
  Paperclip, 
  Trash, 
  AlertTriangle,
  Clock,
  Zap,
  Mail,
  TestTube
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessagePriority, 
  PrivacyLevel, 
  Identity 
} from '@/types';
import { getAvailableEncryptionLevels } from '@/lib/quantumSim';
import { simulateQKDKey, encryptMessage, decryptMessage } from '@/utils/encryption';
import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { getActiveIdentity } from '@/state/identity';
import { sendEncryptedMail } from '@/lib/qmail/sendMail';
import { sendEmailViaSMTP, EmailConfig } from '@/lib/smtp';
import { registerDocumentOnChain, initializeBlockchain, connectWallet } from '@/lib/blockchain';
import { toast } from '@/hooks/use-toast';
import { isTestnetMode, getPiTestnetSigner, registerDocumentToTestnet, generateDocumentHash, getTestnetExplorerUrl } from '@/utils/qblockchain/piTestnet';

interface ComposeFormProps {
  senderIdentities: Identity[];
  activeSenderId: string;
  onChangeSender: (id: string) => void;
  onSubmit: (formData: MessageFormData) => void;
  onSaveDraft: (formData: MessageFormData) => void;
}

export interface MessageFormData {
  recipientId: string;
  subject: string;
  content: string;
  encryptionLevel: string;
  priority: MessagePriority;
  expires: boolean;
  expiresAfter: number; // hours
  attachments: File[];
  visibilityThreshold: PrivacyLevel;
  // New fields for production
  useExternalEmail: boolean;
  externalEmailAddress: string;
  registerOnBlockchain: boolean;
  emailProvider: 'qmail' | 'smtp';
}

export function ComposeForm({ 
  senderIdentities, 
  activeSenderId, 
  onChangeSender,
  onSubmit,
  onSaveDraft
}: ComposeFormProps) {
  const [formData, setFormData] = useState<MessageFormData>({
    recipientId: '',
    subject: '',
    content: '',
    encryptionLevel: 'QUANTUM',
    priority: MessagePriority.NORMAL,
    expires: false,
    expiresAfter: 72, // 3 days
    attachments: [],
    visibilityThreshold: PrivacyLevel.MEDIUM,
    // New fields
    useExternalEmail: false,
    externalEmailAddress: '',
    registerOnBlockchain: false,
    emailProvider: 'qmail'
  });
  
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // SMTP Configuration (in production, this would be stored securely)
  const [smtpConfig] = useState<EmailConfig>({
    provider: 'gmail',
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: 'your-email@gmail.com', // In production, use environment variables
      password: 'your-app-password' // In production, use secure storage
    }
  });

  // Demo encryption states
  const [plainMessage, setPlainMessage] = useState('');
  const [qkdKey, setQkdKey] = useState<number[] | null>(null);
  const [encrypted, setEncrypted] = useState('');
  const [cid, setCid] = useState('');
  const [decryptedFromIpfs, setDecryptedFromIpfs] = useState('');
  const [loadingIPFS, setLoadingIPFS] = useState(false);

  const [demoMessage, setDemoMessage] = useState('');
  const [demoQkdKey, setDemoQkdKey] = useState<number[] | null>(null);
  const [demoEncrypted, setDemoEncrypted] = useState('');
  const [demoCid, setDemoCid] = useState('');
  const [demoDecrypted, setDemoDecrypted] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  // Nuevos estados para testnet
  const [isTestnet] = useState(isTestnetMode());
  const [enableTestnetRegistration, setEnableTestnetRegistration] = useState(false);
  const [testnetTxHash, setTestnetTxHash] = useState<string>('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleCheckboxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    handleCheckboxChange(name, checked);
  };
  
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
    setAttachmentNames(prev => [...prev, ...files.map(f => f.name)]);
  };
  
  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setAttachmentNames(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content.trim() || !formData.subject.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    if (formData.useExternalEmail && !formData.externalEmailAddress.trim()) {
      toast({
        title: "Error", 
        description: "Ingresa la dirección de email externa",
        variant: "destructive"
      });
      return;
    }

    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      toast({
        title: "Error",
        description: "No hay identidad sQuid activa",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(`[QMail Production] Iniciando envío desde identidad: ${activeIdentity.did}`);

      let blockchainTxHash = '';
      let testnetBlockchainTxHash = '';
      
      // Send via QMail (internal ecosystem)
      if (formData.emailProvider === 'qmail') {
        const encryptedMessage = await sendEncryptedMail(formData);

        // Register on blockchain if requested
        if (formData.registerOnBlockchain) {
          try {
            console.log('[QMail Production] Registrando mensaje en blockchain...');
            const blockchain = await initializeBlockchain('polygon');
            const signer = await connectWallet();
            
            const registration = await registerDocumentOnChain(
              encryptedMessage.messageHash,
              encryptedMessage.ipfsHash,
              blockchain,
              signer
            );
            
            blockchainTxHash = registration.txHash;
            console.log(`[QMail Production] ✅ Registrado en blockchain: ${blockchainTxHash}`);
          } catch (blockchainError) {
            console.warn('[QMail Production] ⚠️ Error en blockchain, continuando sin registro:', blockchainError);
          }
        }

        // Registro adicional en Pi Network Testnet si está habilitado
        if (isTestnet && enableTestnetRegistration && formData.registerOnBlockchain) {
          try {
            console.log('[QMail Testnet] Registrando mensaje en Pi Network Testnet...');
            
            // Generar hash del contenido del mensaje
            const messageHash = await generateDocumentHash(formData.content);
            
            // Obtener signer de Pi testnet
            const signer = await getPiTestnetSigner();
            
            // Registrar en testnet
            const testnetResult = await registerDocumentToTestnet(
              messageHash,
              encryptedMessage.ipfsHash,
              signer
            );
            
            testnetBlockchainTxHash = testnetResult.txHash;
            setTestnetTxHash(testnetBlockchainTxHash);
            
            console.log(`[QMail Testnet] ✅ Registrado en Pi testnet: ${testnetBlockchainTxHash}`);
            
            toast({
              title: "Mensaje registrado en Pi Testnet",
              description: `TX: ${testnetBlockchainTxHash.slice(0, 16)}...`,
            });
            
          } catch (testnetError) {
            console.warn('[QMail Testnet] ⚠️ Error en Pi testnet, continuando:', testnetError);
            toast({
              title: "Error en Pi Testnet",
              description: "No se pudo registrar en testnet, mensaje enviado exitosamente",
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Mensaje enviado exitosamente",
          description: `${blockchainTxHash ? 'Registrado en blockchain y ' : ''}almacenado en IPFS${testnetBlockchainTxHash ? ' + Pi Testnet' : ''}`,
        });
      }
      
      // Send via external SMTP if requested  
      if (formData.useExternalEmail) {
        console.log('[QMail Production] Enviando copia por email externo...');
        
        const emailResult = await sendEmailViaSMTP({
          to: formData.externalEmailAddress,
          subject: formData.subject,
          body: formData.content,
          attachments: formData.attachments.map(file => ({
            filename: file.name,
            content: file,
            contentType: file.type
          })),
          isEncrypted: true,
          registerOnBlockchain: formData.registerOnBlockchain
        }, smtpConfig);

        if (emailResult.success) {
          toast({
            title: "Email externo enviado",
            description: `Enviado a ${formData.externalEmailAddress}`,
          });
        } else {
          toast({
            title: "Error en email externo",
            description: emailResult.error,
            variant: "destructive"
          });
        }
      }

      // Call original callback for compatibility
      onSubmit({
        ...formData,
        metadata: {
          blockchainTxHash,
          testnetTxHash: testnetBlockchainTxHash,
          sentViaExternal: formData.useExternalEmail,
          externalEmailAddress: formData.useExternalEmail ? formData.externalEmailAddress : undefined
        }
      } as any);

      // Clear form
      setFormData({
        recipientId: '',
        subject: '',
        content: '',
        encryptionLevel: 'QUANTUM',
        priority: MessagePriority.NORMAL,
        expires: false,
        expiresAfter: 72,
        attachments: [],
        visibilityThreshold: PrivacyLevel.MEDIUM,
        useExternalEmail: false,
        externalEmailAddress: '',
        registerOnBlockchain: false,
        emailProvider: 'qmail'
      });
      setAttachmentNames([]);
      setTestnetTxHash('');

    } catch (error) {
      console.error('[QMail Production] Error en envío:', error);
      toast({
        title: "Error al enviar mensaje",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveDraft = () => {
    onSaveDraft(formData);
  };

  const handlePlainMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPlainMessage(e.target.value);
  };

  const handleEncryptMain = () => {
    const key = simulateQKDKey();
    setQkdKey(key);
    const encryptedMsg = encryptMessage(plainMessage, key);
    setEncrypted(encryptedMsg);
    setDecryptedFromIpfs('');
    setCid('');
  };

  const handleUploadToIPFSMain = async () => {
    if (!encrypted) return;
    setLoadingIPFS(true);
    const hash = await uploadToIPFS(encrypted);
    setCid(hash);
    setLoadingIPFS(false);
  };

  const handleViewFromIPFSMain = async () => {
    if (!cid || !qkdKey) return;
    setLoadingIPFS(true);
    const data = await getFromIPFS(cid);
    const content = typeof data === 'string' ? data : data.content;
    const decrypted = decryptMessage(content, qkdKey);
    setDecryptedFromIpfs(decrypted);
    setLoadingIPFS(false);
  };

  const handleDemoMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDemoMessage(e.target.value);
    setDemoEncrypted('');
    setDemoQkdKey(null);
    setDemoCid('');
    setDemoDecrypted('');
  };

  const handleEncryptDemo = () => {
    const key = simulateQKDKey();
    setDemoQkdKey(key);
    const encryptedMsg = encryptMessage(demoMessage, key);
    setDemoEncrypted(encryptedMsg);
    setDemoCid('');
    setDemoDecrypted('');
  };

  const handleUploadToIPFSDemo = async () => {
    if (!demoEncrypted) return;
    setDemoLoading(true);
    const cid = await uploadToIPFS(demoEncrypted);
    setDemoCid(cid);
    setDemoLoading(false);
  };

  const handleViewFromIPFSDemo = async () => {
    if (!demoCid || !demoQkdKey) return;
    setDemoLoading(true);
    const data = await getFromIPFS(demoCid);
    const content = typeof data === 'string' ? data : data.content;
    const decrypted = decryptMessage(content, demoQkdKey);
    setDemoDecrypted(decrypted);
    setDemoLoading(false);
  };

  const encryptionLevels = getAvailableEncryptionLevels();
  
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1 space-y-4">
            <FormItem>
              <FormLabel>From</FormLabel>
              <Select 
                value={activeSenderId} 
                onValueChange={(value) => onChangeSender(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select identity" />
                </SelectTrigger>
                <SelectContent>
                  {senderIdentities.map(identity => (
                    <SelectItem key={identity.id} value={identity.id}>
                      {identity.name} ({identity.verificationLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            {/* Email Provider Selection */}
            <FormItem>
              <FormLabel>Método de envío</FormLabel>
              <Select 
                value={formData.emailProvider} 
                onValueChange={(value) => handleSelectChange('emailProvider', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qmail">QMail (Ecosistema AnarQ&Q)</SelectItem>
                  <SelectItem value="smtp">Email externo (SMTP)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            
            <FormItem>
              <FormLabel>To *</FormLabel>
              <FormControl>
                <Input 
                  placeholder={formData.emailProvider === 'qmail' ? "Recipient's DID or alias" : "Email address"} 
                  name="recipientId"
                  value={formData.recipientId}
                  onChange={handleInputChange}
                  required
                />
              </FormControl>
              <FormDescription>
                {formData.emailProvider === 'qmail' 
                  ? "Introduce el DID o alias del destinatario en sQuid"
                  : "Introduce la dirección de email del destinatario"
                }
              </FormDescription>
            </FormItem>

            {/* External Email Option */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="useExternalEmail"
                checked={formData.useExternalEmail}
                onCheckedChange={(checked) => handleCheckboxChange('useExternalEmail', checked as boolean)}
              />
              <FormLabel htmlFor="useExternalEmail" className="text-sm">
                Enviar también por email externo
              </FormLabel>
            </div>

            {formData.useExternalEmail && (
              <FormItem>
                <FormLabel>Email externo</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="destinatario@ejemplo.com" 
                    name="externalEmailAddress"
                    type="email"
                    value={formData.externalEmailAddress}
                    onChange={handleInputChange}
                    required={formData.useExternalEmail}
                  />
                </FormControl>
                <FormDescription className="flex items-center">
                  <Mail className="mr-1 h-3 w-3" />
                  Se enviará una copia cifrada por email tradicional
                </FormDescription>
              </FormItem>
            )}
            
            <FormItem>
              <FormLabel>Subject *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Message subject" 
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                />
              </FormControl>
            </FormItem>
            
            <FormItem>
              <FormLabel>Message *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Type your message here..." 
                  className="min-h-[200px]"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                />
              </FormControl>
              <FormDescription>
                Este mensaje será cifrado automáticamente con Qlock usando tu identidad sQuid
              </FormDescription>
            </FormItem>
            
            <MessageEncryption message={formData.content} />
            
            <div className="space-y-2">
              <FormLabel>Attachments</FormLabel>
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach Files
                </Button>
                <Input 
                  id="file-upload"
                  type="file" 
                  className="hidden"
                  onChange={handleAttachmentChange}
                  multiple
                />
              </div>
              
              {attachmentNames.length > 0 && (
                <Card className="mt-2">
                  <CardContent className="p-2">
                    <ul className="space-y-1">
                      {attachmentNames.map((name, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{name}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeAttachment(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-64 space-y-4">
            <FormItem>
              <FormLabel>Encryption Level</FormLabel>
              <Select 
                value={formData.encryptionLevel} 
                onValueChange={(value) => handleSelectChange('encryptionLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {encryptionLevels.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="flex items-center">
                <Lock className="mr-1 h-3 w-3" />
                {formData.encryptionLevel === 'QUANTUM' 
                  ? 'Quantum-secured encryption' 
                  : 'Standard encryption'}
              </FormDescription>
            </FormItem>
            
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleSelectChange('priority', value as MessagePriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MessagePriority).map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.priority === MessagePriority.URGENT && (
                <FormDescription className="flex items-center text-red-500">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Urgent messages are highlighted for recipients
                </FormDescription>
              )}
            </FormItem>
            
            <FormItem className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="expires"
                  name="expires"
                  className="w-4 h-4 rounded border-gray-300"
                  checked={formData.expires}
                  onChange={handleCheckboxInputChange}
                />
                <FormLabel htmlFor="expires" className="m-0">Self-destruct</FormLabel>
              </div>
              
              {formData.expires && (
                <div className="pl-6">
                  <Select 
                    value={formData.expiresAfter.toString()} 
                    onValueChange={(value) => handleSelectChange('expiresAfter', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Expiration time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">7 days</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="flex items-center text-amber-500">
                    <Clock className="mr-1 h-3 w-3" />
                    Message will be deleted after this time
                  </FormDescription>
                </div>
              )}
            </FormItem>
            
            <FormItem>
              <FormLabel>Privacy Threshold</FormLabel>
              <Select 
                value={formData.visibilityThreshold} 
                onValueChange={(value) => handleSelectChange('visibilityThreshold', value as PrivacyLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PrivacyLevel).map(level => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Minimum privacy setting required to see this message
              </FormDescription>
            </FormItem>

            {/* Blockchain Registration Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registerOnBlockchain"
                  checked={formData.registerOnBlockchain}
                  onCheckedChange={(checked) => handleCheckboxChange('registerOnBlockchain', checked as boolean)}
                />
                <FormLabel htmlFor="registerOnBlockchain" className="text-sm">
                  Registrar en blockchain
                </FormLabel>
              </div>
              
              {formData.registerOnBlockchain && (
                <FormDescription className="flex items-center text-purple-600 pl-6">
                  <Zap className="mr-1 h-3 w-3" />
                  Se registrará hash del mensaje en Polygon para verificación inmutable
                </FormDescription>
              )}

              {/* Opción adicional para Pi Network Testnet */}
              {isTestnet && formData.registerOnBlockchain && (
                <div className="pl-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableTestnetRegistration"
                      checked={enableTestnetRegistration}
                      onCheckedChange={(checked) => setEnableTestnetRegistration(checked as boolean)}
                    />
                    <FormLabel htmlFor="enableTestnetRegistration" className="text-sm">
                      También registrar en Pi Network Testnet
                    </FormLabel>
                  </div>
                  
                  {enableTestnetRegistration && (
                    <FormDescription className="flex items-center text-blue-600 pl-6 mt-1">
                      <TestTube className="mr-1 h-3 w-3" />
                      Registro adicional en Pi Network Testnet (Firenet) para pruebas
                    </FormDescription>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Enviando...' : 'Send Message'}
          </Button>
        </div>

        <div className="mt-10 p-4 border rounded-lg bg-gray-50 space-y-3">
          <h3 className="text-base font-semibold mb-2">Cifrado cuántico/IPFS (demo Qmail)</h3>
          <label className="block text-sm font-medium mb-1" htmlFor="qmail-demo-msg">
            Redacta un mensaje a cifrar (demo, no se envía ni impacta otros campos)
          </label>
          <textarea
            id="qmail-demo-msg"
            value={demoMessage}
            onChange={handleDemoMessageChange}
            className="w-full border rounded p-2 mb-2 resize-y min-h-[80px]"
            placeholder="Escribe un mensaje para cifrar y subir a IPFS"
          />

          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              className="bg-secondary text-white px-4 py-2 text-sm rounded hover:bg-secondary/90 disabled:opacity-70"
              disabled={!demoMessage}
              onClick={handleEncryptDemo}
            >
              Cifrar con clave QKD
            </button>
            <button
              type="button"
              className="border px-4 py-2 text-sm rounded bg-white hover:bg-gray-100 disabled:opacity-70"
              disabled={!demoEncrypted || demoLoading}
              onClick={handleUploadToIPFSDemo}
            >
              Subir a IPFS
            </button>
            <button
              type="button"
              className="border px-4 py-2 text-sm rounded bg-white hover:bg-gray-100 disabled:opacity-70"
              disabled={!demoCid || !demoQkdKey || demoLoading}
              onClick={handleViewFromIPFSDemo}
            >
              Ver desde IPFS
            </button>
          </div>

          {demoEncrypted && (
            <div className="mb-2">
              <span className="block text-xs font-semibold mb-1">Mensaje cifrado:</span>
              <div className="p-2 bg-gray-100 rounded text-xs break-all">{demoEncrypted}</div>
            </div>
          )}

          {demoCid && (
            <div className="mb-2">
              <span className="block text-xs font-semibold mb-1">CID / IPFS:</span>
              <div className="p-2 bg-gray-100 rounded text-xs break-all">{demoCid}</div>
            </div>
          )}

          {demoDecrypted && (
            <div>
              <span className="block text-xs font-semibold mb-1">Mensaje descifrado (IPFS):</span>
              <div className="p-2 bg-green-100 rounded text-xs break-all">{demoDecrypted}</div>
            </div>
          )}
          {demoLoading && (
            <div className="text-sm text-gray-400 mt-2">Procesando operación en IPFS/cifrado...</div>
          )}
        </div>

        {/* Mostrar información de transacciones testnet */}
        {testnetTxHash && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-sm font-medium text-purple-800 mb-2">
              🔗 Registrado en Pi Network Testnet
            </div>
            <div className="text-xs font-mono text-purple-700 break-all mb-2">
              TX: {testnetTxHash}
            </div>
            <a 
              href={getTestnetExplorerUrl(testnetTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-800 underline"
            >
              Ver en explorador de testnet →
            </a>
          </div>
        )}
      </form>
    </>
  );
}
