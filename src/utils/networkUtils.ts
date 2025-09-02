
/**
 * Simula latencia de red para operaciones asíncronas
 * @param minDelay Tiempo mínimo de espera en milisegundos
 * @param maxDelay Tiempo máximo de espera en milisegundos
 */
export const simulateNetworkDelay = (
  minDelay: number = 300, 
  maxDelay: number = 1500
) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (maxDelay - minDelay) + minDelay));
