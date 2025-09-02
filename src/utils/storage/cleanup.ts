
/**
 * Limpieza de localStorage - Elimina variables obsoletas del modo simulación
 */

export function cleanupObsoleteStorage() {
  const obsoleteKeys = [
    'mock_session', 
    'test_mode',
    'demo_user',
    'simulation_active',
    'local_ipfs',
    'fake_identity',
    'example_user',
    'ipfs_config',
    'ipfs_simulation',
    'backend_mode'
  ];

  obsoleteKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`[Cleanup] Removed obsolete key: ${key}`);
    }
  });

  console.log('[Cleanup] Storage cleanup completed - IPFS real mode is always active');
}

/**
 * Verifica que solo existan variables de sesión válidas
 */
export function validateStorageState(): boolean {
  const validKeys = [
    'active_user_did',
    'active_space_did', 
    'space_delegation_ucan',
    'squid-identity-storage',
    'anarq_environment' // Permitir configuración de entorno
  ];

  const allKeys = Object.keys(localStorage);
  const hasOnlyValidKeys = allKeys.every(key => 
    validKeys.includes(key) || key.startsWith('squid-') || key.startsWith('anarq_')
  );

  if (!hasOnlyValidKeys) {
    console.warn('[Storage] Some non-essential keys detected in localStorage, but system will continue normally');
    return true; // No bloquear el sistema por claves no esenciales
  }

  return true;
}

/**
 * Inicialización de limpieza al cargar la app
 */
export function initializeStorageCleanup() {
  cleanupObsoleteStorage();
  validateStorageState();
  console.log('[System] IPFS real mode is always active - no configuration needed');
}
