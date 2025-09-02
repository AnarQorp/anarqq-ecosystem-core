
/**
 * Blockchain Integration for Production
 * Handles document registration on Ethereum/Polygon networks
 */

import { ethers } from 'ethers';
import { getActiveIdentity } from '@/state/identity';

// Production network configurations
const NETWORKS = {
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com'
  },
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet', 
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    explorer: 'https://etherscan.io'
  },
  mumbai: {
    chainId: 80001,
    name: 'Polygon Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorer: 'https://mumbai.polygonscan.com'
  }
};

// Simple document registry contract ABI
const DOCUMENT_REGISTRY_ABI = [
  "function registerDocument(bytes32 documentHash, string ipfsHash, uint256 timestamp) external",
  "function getDocument(bytes32 documentHash) external view returns (address owner, string ipfsHash, uint256 timestamp, bool exists)",
  "event DocumentRegistered(bytes32 indexed documentHash, address indexed owner, string ipfsHash, uint256 timestamp)"
];

// Contract addresses (to be deployed)
const CONTRACT_ADDRESSES = {
  polygon: "0x0000000000000000000000000000000000000000", // TODO: Deploy contract
  ethereum: "0x0000000000000000000000000000000000000000", // TODO: Deploy contract  
  mumbai: "0x0000000000000000000000000000000000000000" // TODO: Deploy contract
};

export interface BlockchainConfig {
  network: keyof typeof NETWORKS;
  contractAddress: string;
  provider: ethers.Provider;
}

export interface DocumentRegistration {
  documentHash: string;
  ipfsHash: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  gasUsed: string;
  network: string;
}

/**
 * Initialize blockchain connection
 */
export async function initializeBlockchain(network: keyof typeof NETWORKS = 'polygon'): Promise<BlockchainConfig> {
  console.log(`[Blockchain] Inicializando conexión a ${NETWORKS[network].name}`);
  
  const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpcUrl);
  
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`[Blockchain] ✅ Conectado a bloque #${blockNumber}`);
    
    return {
      network,
      contractAddress: CONTRACT_ADDRESSES[network],
      provider
    };
  } catch (error) {
    console.error('[Blockchain] ❌ Error de conexión:', error);
    throw new Error(`No se pudo conectar a ${NETWORKS[network].name}`);
  }
}

/**
 * Connect wallet and get signer
 */
export async function connectWallet(): Promise<ethers.Signer> {
  console.log('[Blockchain] Solicitando conexión de wallet...');
  
  if (!window.ethereum) {
    throw new Error('MetaMask o wallet compatible no detectada');
  }
  
  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const address = await signer.getAddress();
    console.log(`[Blockchain] ✅ Wallet conectada: ${address.slice(0, 8)}...`);
    
    return signer;
  } catch (error) {
    console.error('[Blockchain] ❌ Error conectando wallet:', error);
    throw new Error('Error al conectar wallet');
  }
}

/**
 * Register document on blockchain
 */
export async function registerDocumentOnChain(
  documentHash: string,
  ipfsHash: string,
  config: BlockchainConfig,
  signer: ethers.Signer
): Promise<DocumentRegistration> {
  console.log(`[Blockchain] Registrando documento en ${NETWORKS[config.network].name}`);
  console.log(`[Blockchain] Hash: ${documentHash.slice(0, 16)}...`);
  console.log(`[Blockchain] IPFS: ${ipfsHash.slice(0, 16)}...`);
  
  const activeIdentity = getActiveIdentity();
  if (!activeIdentity) {
    throw new Error('No hay identidad sQuid activa');
  }
  
  try {
    const contract = new ethers.Contract(
      config.contractAddress, 
      DOCUMENT_REGISTRY_ABI, 
      signer
    );
    
    const timestamp = Math.floor(Date.now() / 1000);
    const documentHashBytes32 = ethers.id(documentHash);
    
    // Estimate gas
    const gasEstimate = await contract.registerDocument.estimateGas(
      documentHashBytes32,
      ipfsHash,
      timestamp
    );
    
    console.log(`[Blockchain] Gas estimado: ${gasEstimate.toString()}`);
    
    // Send transaction with 20% buffer for gas
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
    
    const tx = await contract.registerDocument(
      documentHashBytes32,
      ipfsHash,
      timestamp,
      { gasLimit }
    );
    
    console.log(`[Blockchain] Transacción enviada: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log(`[Blockchain] ✅ Documento registrado en bloque #${receipt.blockNumber}`);
    
    return {
      documentHash,
      ipfsHash,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp,
      gasUsed: receipt.gasUsed.toString(),
      network: config.network
    };
    
  } catch (error) {
    console.error('[Blockchain] ❌ Error registrando documento:', error);
    throw new Error(`Error en transacción blockchain: ${error.message}`);
  }
}

/**
 * Verify document exists on blockchain
 */
export async function verifyDocumentOnChain(
  documentHash: string,
  config: BlockchainConfig
): Promise<{
  exists: boolean;
  owner: string;
  ipfsHash: string;
  timestamp: number;
}> {
  console.log(`[Blockchain] Verificando documento: ${documentHash.slice(0, 16)}...`);
  
  try {
    const contract = new ethers.Contract(
      config.contractAddress,
      DOCUMENT_REGISTRY_ABI,
      config.provider
    );
    
    const documentHashBytes32 = ethers.id(documentHash);
    const result = await contract.getDocument(documentHashBytes32);
    
    console.log(`[Blockchain] Documento ${result.exists ? 'encontrado' : 'no encontrado'}`);
    
    return {
      exists: result.exists,
      owner: result.owner,
      ipfsHash: result.ipfsHash,
      timestamp: result.timestamp
    };
    
  } catch (error) {
    console.error('[Blockchain] ❌ Error verificando documento:', error);
    return { exists: false, owner: '', ipfsHash: '', timestamp: 0 };
  }
}

/**
 * Get network status
 */
export async function getNetworkStatus(provider: ethers.Provider): Promise<{
  chainId: number;
  blockNumber: number;
  gasPrice: string;
  isConnected: boolean;
}> {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();
    
    return {
      chainId: Number(network.chainId),
      blockNumber,
      gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei') + ' gwei',
      isConnected: true
    };
  } catch (error) {
    console.error('[Blockchain] Error obteniendo estado de red:', error);
    return {
      chainId: 0,
      blockNumber: 0,
      gasPrice: '0 gwei',
      isConnected: false
    };
  }
}

/**
 * Format blockchain explorer URL
 */
export function getExplorerUrl(network: keyof typeof NETWORKS, txHash: string): string {
  return `${NETWORKS[network].explorer}/tx/${txHash}`;
}

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
