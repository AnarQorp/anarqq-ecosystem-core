
/**
 * Pi Network Testnet Integration
 * Servicio para interactuar con la testnet de Pi Network
 */

import { ethers } from 'ethers';

// ABI del contrato DocumentRegistry
const contractABI = [
  "function registerDocument(bytes32 documentHash, string ipfsHash) external",
  "function getRecord(bytes32 documentHash) external view returns (address, string, uint256, bool)",
  "function isDocumentRegistered(bytes32 documentHash) external view returns (bool)",
  "function getTotalDocuments() external view returns (uint256)",
  "event DocumentRegistered(bytes32 indexed documentHash, address indexed sender, string ipfsHash, uint256 timestamp)"
];

// Configuración de la red testnet
const TESTNET_CONFIG = {
  rpcUrl: import.meta.env.VITE_PI_TESTNET_RPC || 'https://api.testnet.minepi.com',
  chainId: parseInt(import.meta.env.VITE_PI_TESTNET_CHAIN_ID || '12345'),
  contractAddress: import.meta.env.VITE_PI_TESTNET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  explorerUrl: import.meta.env.VITE_PI_TESTNET_EXPLORER || 'https://explorer.testnet.minepi.com/tx/'
};

export interface TestnetRegistration {
  documentHash: string;
  ipfsHash: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  sender: string;
}

/**
 * Conectar con Pi Network Testnet
 */
export async function connectToTestnet(): Promise<ethers.Provider> {
  console.log('[Pi Testnet] Conectando a testnet...');
  
  const provider = new ethers.JsonRpcProvider(TESTNET_CONFIG.rpcUrl);
  
  try {
    const network = await provider.getNetwork();
    console.log(`[Pi Testnet] ✅ Conectado a red ${network.chainId}`);
    return provider;
  } catch (error) {
    console.error('[Pi Testnet] ❌ Error de conexión:', error);
    throw new Error('No se pudo conectar a Pi Network testnet');
  }
}

/**
 * Obtener signer para firmar transacciones
 */
export async function getPiTestnetSigner(): Promise<ethers.Signer> {
  console.log('[Pi Testnet] Solicitando signer...');
  
  if (!window.ethereum) {
    throw new Error('Pi Browser o wallet compatible no detectada');
  }
  
  try {
    // Solicitar acceso a cuentas
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Verificar red
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const expectedChainId = `0x${TESTNET_CONFIG.chainId.toString(16)}`;
    
    if (chainId !== expectedChainId) {
      console.log(`[Pi Testnet] Cambiando a red testnet (${expectedChainId})...`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }],
        });
      } catch (switchError: any) {
        // Si la red no está agregada, agregarla
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: expectedChainId,
              chainName: 'Pi Network Testnet',
              rpcUrls: [TESTNET_CONFIG.rpcUrl],
              blockExplorerUrls: [TESTNET_CONFIG.explorerUrl.replace('/tx/', '')]
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const address = await signer.getAddress();
    console.log(`[Pi Testnet] ✅ Signer conectado: ${address}`);
    
    return signer;
  } catch (error) {
    console.error('[Pi Testnet] ❌ Error obteniendo signer:', error);
    throw new Error('Error al conectar wallet con testnet');
  }
}

/**
 * Registrar documento en Pi Network testnet
 */
export async function registerDocumentToTestnet(
  documentHash: string,
  ipfsHash: string,
  signer: ethers.Signer
): Promise<TestnetRegistration> {
  console.log('[Pi Testnet] Registrando documento...');
  console.log(`[Pi Testnet] Hash: ${documentHash.slice(0, 16)}...`);
  console.log(`[Pi Testnet] IPFS: ${ipfsHash.slice(0, 16)}...`);
  
  if (!TESTNET_CONFIG.contractAddress || TESTNET_CONFIG.contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('Dirección del contrato no configurada. Despliega el contrato primero.');
  }
  
  try {
    const contract = new ethers.Contract(
      TESTNET_CONFIG.contractAddress,
      contractABI,
      signer
    );
    
    // Convertir hash a bytes32
    const documentHashBytes32 = ethers.id(documentHash);
    
    // Estimar gas
    const gasEstimate = await contract.registerDocument.estimateGas(
      documentHashBytes32,
      ipfsHash
    );
    
    console.log(`[Pi Testnet] Gas estimado: ${gasEstimate.toString()}`);
    
    // Enviar transacción
    const tx = await contract.registerDocument(
      documentHashBytes32,
      ipfsHash,
      { gasLimit: gasEstimate * BigInt(120) / BigInt(100) } // 20% buffer
    );
    
    console.log(`[Pi Testnet] Transacción enviada: ${tx.hash}`);
    
    // Esperar confirmación
    const receipt = await tx.wait();
    const sender = await signer.getAddress();
    
    console.log(`[Pi Testnet] ✅ Documento registrado en bloque #${receipt.blockNumber}`);
    
    return {
      documentHash,
      ipfsHash,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
      sender
    };
    
  } catch (error) {
    console.error('[Pi Testnet] ❌ Error registrando documento:', error);
    throw new Error(`Error en registro testnet: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Verificar si un documento está registrado
 */
export async function verifyDocumentInTestnet(
  documentHash: string,
  provider: ethers.Provider
): Promise<{
  exists: boolean;
  sender: string;
  ipfsHash: string;
  timestamp: number;
}> {
  console.log(`[Pi Testnet] Verificando documento: ${documentHash.slice(0, 16)}...`);
  
  try {
    const contract = new ethers.Contract(
      TESTNET_CONFIG.contractAddress,
      contractABI,
      provider
    );
    
    const documentHashBytes32 = ethers.id(documentHash);
    const result = await contract.getRecord(documentHashBytes32);
    
    return {
      exists: result[3], // bool exists
      sender: result[0], // address sender
      ipfsHash: result[1], // string ipfsHash
      timestamp: Number(result[2]) // uint256 timestamp
    };
    
  } catch (error) {
    console.error('[Pi Testnet] ❌ Error verificando documento:', error);
    return { exists: false, sender: '', ipfsHash: '', timestamp: 0 };
  }
}

/**
 * Obtener URL del explorador para una transacción
 */
export function getTestnetExplorerUrl(txHash: string): string {
  return `${TESTNET_CONFIG.explorerUrl}${txHash}`;
}

/**
 * Generar hash SHA-256 de un documento
 */
export async function generateDocumentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verificar si estamos en modo testnet
 */
export function isTestnetMode(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'testnet';
}

/**
 * Obtener configuración actual de la red
 */
export function getNetworkConfig() {
  return TESTNET_CONFIG;
}

// Extender window type para ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
