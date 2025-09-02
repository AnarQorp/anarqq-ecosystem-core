
/**
 * Simula el cambio de espacio en Web3.Storage vinculado a una subidentidad (o raíz).
 * Aquí puedes conectar con web3.storage real o dejarlo en mock.
 */

let currentSpace: string | null = null;

export function setCurrentSpace(did: string) {
  currentSpace = did;
  console.log(`[sQuid] Espacio activo cambiado a DID: ${did}`);
}

export function getCurrentSpace() {
  return currentSpace;
}
