import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Shield, TestTube, User } from 'lucide-react';
import { uploadFile, downloadFile } from '@/lib/ipfsClient';
import { encryptFile } from '@/lib/qlock';
import { generateContentHash } from '@/components/qindex/QindexCore';
import { logAccess } from '@/components/qerberos/QerberosLog';
import { toast } from '@/hooks/use-toast';
import { logFileOperation } from '@/lib/qindex';
import { verifyIntegrity, runQerberosTests } from '@/lib/qerberos';
import { registerToQindex } from '@/modules/Qindex';
import { registerFileIndex, getIndexByCID } from '@/api/qindex';
import { verifyIntegrity as verifyFileIntegrity } from '@/api/qerberos';
// Actualizar imports para usar el estado correcto de sQuid
import { useIdentityStore, getActiveIdentity as getSquidIdentity, getActiveDID as getSquidDID } from '@/state/identity';
import { getCurrentSpace } from '@/lib/squidSpace';
import { isTestnetMode, getPiTestnetSigner, registerDocumentToTestnet, generateDocumentHash, getTestnetExplorerUrl } from '@/utils/qblockchain/piTestnet';

export const UploadSection = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedHash, setUploadedHash] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [isTestnet] = useState(isTestnetMode());
  const [enableTestnetRegistration, setEnableTestnetRegistration] = useState(false);
  const [testnetTxHash, setTestnetTxHash] = useState<string>('');
  const [isRegisteringTestnet, setIsRegisteringTestnet] = useState(false);

  // Usar el estado de identidad sQuid directamente
  const { activeIdentity, isAuthenticated } = useIdentityStore();
  const currentSpace = getCurrentSpace();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      console.log('📁 Archivo seleccionado:', selectedFile.name, selectedFile.size, 'bytes');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo primero',
        variant: 'destructive'
      });
      return;
    }

    if (!isAuthenticated || !activeIdentity) {
      toast({
        title: 'Error de autenticación',
        description: 'Debes iniciar sesión con sQuid primero',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    setVerificationResult(null);
    setTestnetTxHash(''); // Limpiar hash anterior

    try {
      // 1. Leer contenido del archivo original
      const originalContent = await file.text();
      console.log('📄 Contenido leído:', originalContent.length, 'caracteres');
      console.log('🔐 Usando identidad sQuid:', activeIdentity.did.slice(0, 20) + '...');

      // 2. Generar hash del contenido original (antes de cifrar)
      const originalHash = await generateContentHash(originalContent);
      console.log('🔍 Hash original generado:', originalHash.substring(0, 16) + '...');

      let finalContent = originalContent;
      let aesKey = '';
      let encryptedHash = originalHash;

      // 3. Cifrar con sQuid/Qlock si está habilitado
      if (encryptionEnabled) {
        console.log('🔒 Cifrando archivo con identidad sQuid...');
        const encryptionResult = await encryptFile(file);
        
        // Convertir el blob cifrado a texto para subirlo
        finalContent = await encryptionResult.encryptedBlob.text();
        aesKey = encryptionResult.aesKey;
        
        // Generar hash del contenido cifrado
        encryptedHash = await generateContentHash(finalContent);
        console.log('✅ Archivo cifrado exitosamente');
        console.log('🔐 DID usado:', encryptionResult.did.slice(0, 16) + '...');
        console.log('🔑 Clave AES:', aesKey.slice(0, 8) + '...');
        console.log('🔍 Hash cifrado:', encryptedHash.substring(0, 16) + '...');
      }

      // 4. Subir a IPFS
      console.log('🚀 Subiendo a IPFS...');
      const result = await uploadFile(file.name, finalContent);
      const cid = result.hash;
      setUploadedHash(cid);

      // 5. Registrar log detallado en QIndex con información completa
      await logFileOperation(
        cid,
        encryptedHash,
        activeIdentity.did,
        'UPLOAD',
        file.name,
        file.size,
        activeIdentity.space || 'default_space',
        aesKey
      );

      // 6. Registrar acceso en QerberosLog
      logAccess({
        cid,
        identity: activeIdentity.did,
        status: 'SUCCESS',
        operation: 'UPLOAD',
        reason: 'File uploaded successfully with sQuid integration',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          encrypted: encryptionEnabled,
          space: activeIdentity.space || 'default_space',
          identityType: activeIdentity.type
        }
      });

      console.log('🔄 Iniciando validaciones modulares...');

      // 7. Registro estructurado en QIndex con contexto de identidad
      try {
        await registerFileIndex(
          cid,
          file.name,
          'private',
          activeIdentity.did,
          file.size
        );
        console.log('✅ Registro estructurado en QIndex: EXITOSO');
      } catch (qindexError) {
        console.error('❌ Error en registro estructurado QIndex:', qindexError);
      }

      // 8. Verificar integridad con Qerberos
      try {
        const integrityValid = await verifyFileIntegrity(uploadedHash, file);
        if (integrityValid) {
          console.log('✅ Validación Qerberos: EXITOSA');
        } else {
          console.log('❌ Validación Qerberos: FALLIDA');
          toast({
            title: '⚠️ Advertencia de integridad',
            description: 'El archivo se subió pero falló la verificación de integridad',
            variant: 'destructive'
          });
        }
      } catch (qerberosError) {
        console.error('❌ Error en validación Qerberos:', qerberosError);
      }

      // 9. Registro modular completo en Qindex
      try {
        console.log('🗂️ Iniciando registro modular en Qindex...');
        const registerResult = await registerToQindex({
          cid: cid,
          aesKey: aesKey || 'no_encryption',
          owner: activeIdentity.did,
          filename: file.name
        });

        if (registerResult.success) {
          console.log('✅ Registro modular Qindex: EXITOSO');
          console.log('📋 Índice creado:', registerResult.index);
        } else {
          console.log('❌ Registro modular Qindex: FALLIDO');
          console.error('Error:', registerResult.error);
        }
      } catch (qindexModularError) {
        console.error('❌ Error en registro modular Qindex:', qindexModularError);
      }

      toast({
        title: '🎉 Subida exitosa',
        description: `Archivo cifrado y subido con CID: ${cid.substring(0, 16)}...${testnetTxHash ? ' y registrado en blockchain' : ''}`,
      });

      console.log('✅ Proceso completado. CID:', cid);
      console.log('🔐 Identidad:', activeIdentity.did.slice(0, 16) + '...');
      console.log('🏠 Espacio:', activeIdentity.space || 'default_space');
      if (testnetTxHash) {
        console.log('🔗 Testnet TX:', testnetTxHash);
      }
      
    } catch (error) {
      console.error('❌ Error en subida:', error);
      
      toast({
        title: 'Error de subida',
        description: `No se pudo subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!file || !uploadedHash) {
      toast({
        title: 'Error',
        description: 'No hay archivo subido para verificar',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      console.log('🔍 Iniciando verificación de integridad...');
      
      // Obtener información del índice
      const indexEntry = await getIndexByCID(uploadedHash);
      
      if (!indexEntry) {
        toast({
          title: 'Error',
          description: 'Archivo no encontrado en el índice',
          variant: 'destructive'
        });
        return;
      }

      console.log('📋 Información del índice recuperada:', indexEntry);

      // Verificar integridad usando Qerberos
      const isValid = await verifyFileIntegrity(uploadedHash, file);
      
      setVerificationResult(isValid);

      if (isValid) {
        toast({
          title: '✅ Integridad verificada',
          description: 'El archivo no ha sido alterado',
        });
      } else {
        toast({
          title: '⚠️ Alerta de integridad',
          description: 'Posible corrupción detectada en el archivo',
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('❌ Error en verificación:', error);
      setVerificationResult(false);
      
      toast({
        title: 'Error de verificación',
        description: `No se pudo verificar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunTests = async () => {
    setIsTesting(true);
    
    try {
      console.log('🧪 Ejecutando tests de Qerberos...');
      const testResults = await runQerberosTests();
      
      toast({
        title: '🧪 Tests completados',
        description: `Verificación: ${testResults.correctVerification.status}, Manipulación: ${testResults.manipulationAttempt.status}, No autorizado: ${testResults.unauthorizedAccess.status}`,
      });
      
      console.log('✅ Tests de Qerberos completados:', testResults);
    } catch (error) {
      console.error('❌ Error en tests:', error);
      toast({
        title: 'Error en tests',
        description: 'No se pudieron ejecutar los tests de Qerberos',
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir y Cifrar Archivo
          {isTestnet && (
            <Badge variant="secondary" className="text-xs">
              <TestTube className="mr-1 h-3 w-3" />
              Testnet
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sube archivos a IPFS con cifrado QLock basado en tu identidad sQuid activa
          {isTestnet && ' • Registro blockchain en Pi Network Testnet disponible'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información de identidad activa */}
        {isAuthenticated && activeIdentity ? (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Identidad activa:</span>
              <span className="font-mono">{activeIdentity.did.slice(0, 24)}...</span>
              <Badge variant={activeIdentity.type === 'ROOT' ? "default" : "secondary"}>
                {activeIdentity.type}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Nombre: {activeIdentity.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Espacio: {activeIdentity.space || 'default_space'}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-sm text-destructive">
              ⚠️ No hay identidad activa. <strong>Inicia sesión con sQuid</strong> para subir archivos.
            </div>
          </div>
        )}

        <div>
          <Input
            type="file"
            onChange={handleFileSelect}
            accept=".txt,.json,.md"
            className="mb-2"
            disabled={!isAuthenticated || !activeIdentity}
          />
          {file && (
            <div className="text-sm text-muted-foreground">
              Archivo seleccionado: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>

        {/* Nueva sección: Registro en Pi Network Testnet */}
        {isTestnet && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Pi Network Testnet</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableTestnetRegistration"
                checked={enableTestnetRegistration}
                onChange={(e) => setEnableTestnetRegistration(e.target.checked)}
                className="w-4 h-4"
                disabled={!isAuthenticated || !activeIdentity}
              />
              <label htmlFor="enableTestnetRegistration" className="text-sm text-purple-700">
                Registrar documento en Pi Network Testnet (inmutable)
              </label>
            </div>
            
            {enableTestnetRegistration && (
              <div className="text-xs text-purple-600 pl-6">
                ⚠️ Se solicitará firma con wallet Pi para registrar el hash del documento en blockchain
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Cifrado QLock:</span>
          <Badge variant={encryptionEnabled ? "default" : "secondary"}>
            {encryptionEnabled ? "Habilitado" : "Deshabilitado"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEncryptionEnabled(!encryptionEnabled)}
            disabled={!isAuthenticated || !activeIdentity}
          >
            {encryptionEnabled ? "Deshabilitar" : "Habilitar"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleUpload}
            disabled={!file || isUploading || !isAuthenticated || !activeIdentity}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isRegisteringTestnet ? 'Registrando en blockchain...' : 'Subiendo...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir a IPFS
                {isTestnet && enableTestnetRegistration && ' + Testnet'}
              </>
            )}
          </Button>
          
          <Button
            onClick={handleRunTests}
            disabled={isTesting}
            variant="outline"
            size="default"
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Test Qerberos
              </>
            )}
          </Button>
        </div>

        {uploadedHash && (
          <div className="mt-4 p-3 bg-muted rounded-lg space-y-3">
            <div className="text-sm font-medium mb-1">✅ Archivo subido exitosamente</div>
            <div className="text-xs font-mono break-all">
              CID: {uploadedHash}
            </div>
            
            {/* Mostrar información de testnet si aplica */}
            {testnetTxHash && (
              <div className="p-2 bg-purple-100 rounded border border-purple-200">
                <div className="text-xs font-medium text-purple-800 mb-1">
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
            
            <div className="text-xs text-muted-foreground">
              Cifrado con sQuid • Registrado en QIndex • Trazabilidad en Qerberos
              {testnetTxHash && ' • Inmutable en Pi Testnet'}
            </div>
            
            {/* Botón de verificación de integridad */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                variant="outline"
                size="sm"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-3 w-3" />
                    Verificar Integridad
                  </>
                )}
              </Button>
              
              {verificationResult !== null && (
                <Badge variant={verificationResult ? "default" : "destructive"}>
                  {verificationResult ? "Íntegro" : "Corrupto"}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
