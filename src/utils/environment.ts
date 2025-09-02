
/**
 * Environment Management
 * Gestiona dinámicamente entre producción y testnet
 */

export type Environment = 'production' | 'testnet';

const ENV_STORAGE_KEY = 'anarq_environment';

/**
 * Obtiene el entorno activo desde localStorage o por defecto
 */
export function getCurrentEnvironment(): Environment {
  if (typeof window === 'undefined') return 'production';
  
  const stored = localStorage.getItem(ENV_STORAGE_KEY);
  return (stored as Environment) || 'production';
}

/**
 * Cambia el entorno activo y recarga la página
 */
export function setEnvironment(env: Environment): void {
  localStorage.setItem(ENV_STORAGE_KEY, env);
  window.location.reload();
}

/**
 * Obtiene la configuración según el entorno activo
 */
export function getEnvironmentConfig() {
  const env = getCurrentEnvironment();
  
  if (env === 'testnet') {
    return {
      environment: 'testnet',
      rpc: import.meta.env.VITE_PI_TESTNET_RPC || 'https://api.testnet.minepi.com',
      chainId: parseInt(import.meta.env.VITE_PI_TESTNET_CHAIN_ID || '12345'),
      contractAddress: import.meta.env.VITE_PI_TESTNET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      explorer: import.meta.env.VITE_PI_TESTNET_EXPLORER || 'https://explorer.testnet.minepi.com/tx/',
      networkName: 'Pi Network Testnet'
    };
  }
  
  return {
    environment: 'production',
    rpc: import.meta.env.VITE_PRODUCTION_RPC || 'https://polygon-rpc.com',
    chainId: 137, // Polygon mainnet
    contractAddress: import.meta.env.VITE_PRODUCTION_CONTRACT_ADDRESS || '',
    explorer: 'https://polygonscan.com/tx/',
    networkName: 'Polygon Mainnet'
  };
}

/**
 * Verifica si estamos en modo testnet
 */
export function isTestnetMode(): boolean {
  return getCurrentEnvironment() === 'testnet';
}
