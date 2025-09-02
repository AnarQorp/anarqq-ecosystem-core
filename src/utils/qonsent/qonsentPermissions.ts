
/**
 * Qonsent Permissions Manager
 * Gestión de permisos granulares para recursos del ecosistema
 */

export type PermissionType = 'read' | 'download' | 'share' | 'comment';
export type ResourceType = 'document' | 'image' | 'video' | 'message' | 'file';

export interface QonsentPermission {
  resourceId: string;
  resourceType: ResourceType;
  resourceName: string;
  ownerDID: string;
  grantedToAlias: string;
  grantedToDID: string;
  permissions: PermissionType[];
  grantedAt: number;
  expiresAt?: number;
  moduleOrigin: string; // 'Qmail', 'Qchat', 'Qdrive', 'Qpic'
  metadata?: Record<string, any>;
}

const PERMISSIONS_STORAGE_KEY = 'qonsent_permissions';

/**
 * Carga permisos desde localStorage
 */
function loadPermissions(): QonsentPermission[] {
  try {
    const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Qonsent] Error cargando permisos:', error);
    return [];
  }
}

/**
 * Guarda permisos en localStorage
 */
function savePermissions(permissions: QonsentPermission[]): void {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    console.log(`[Qonsent] Guardados ${permissions.length} permisos`);
  } catch (error) {
    console.error('[Qonsent] Error guardando permisos:', error);
  }
}

/**
 * Obtiene permisos otorgados por un usuario
 */
export function getPermissionsByOwner(ownerDID: string): QonsentPermission[] {
  const permissions = loadPermissions();
  return permissions.filter(p => p.ownerDID === ownerDID);
}

/**
 * Obtiene permisos de un recurso específico
 */
export function getResourcePermissions(resourceId: string): QonsentPermission[] {
  const permissions = loadPermissions();
  return permissions.filter(p => p.resourceId === resourceId);
}

/**
 * Otorga permisos sobre un recurso
 */
export function grantPermissions(
  resourceId: string,
  resourceType: ResourceType,
  resourceName: string,
  ownerDID: string,
  grantedToAlias: string,
  grantedToDID: string,
  permissions: PermissionType[],
  moduleOrigin: string,
  expiresAt?: number
): boolean {
  try {
    const allPermissions = loadPermissions();
    
    // Verificar si ya existe un permiso para este recurso y usuario
    const existingIndex = allPermissions.findIndex(
      p => p.resourceId === resourceId && p.grantedToDID === grantedToDID
    );
    
    const newPermission: QonsentPermission = {
      resourceId,
      resourceType,
      resourceName,
      ownerDID,
      grantedToAlias,
      grantedToDID,
      permissions,
      grantedAt: Date.now(),
      expiresAt,
      moduleOrigin,
      metadata: {}
    };
    
    if (existingIndex >= 0) {
      // Actualizar permisos existentes
      allPermissions[existingIndex] = newPermission;
    } else {
      // Añadir nuevo permiso
      allPermissions.push(newPermission);
    }
    
    savePermissions(allPermissions);
    console.log(`[Qonsent] ✅ Permisos otorgados: ${permissions.join(', ')} a ${grantedToAlias}`);
    return true;
  } catch (error) {
    console.error('[Qonsent] Error otorgando permisos:', error);
    return false;
  }
}

/**
 * Revoca permisos específicos
 */
export function revokePermissions(resourceId: string, grantedToDID: string): boolean {
  try {
    const allPermissions = loadPermissions();
    const filteredPermissions = allPermissions.filter(
      p => !(p.resourceId === resourceId && p.grantedToDID === grantedToDID)
    );
    
    if (filteredPermissions.length < allPermissions.length) {
      savePermissions(filteredPermissions);
      console.log(`[Qonsent] ❌ Permisos revocados para recurso: ${resourceId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Qonsent] Error revocando permisos:', error);
    return false;
  }
}

/**
 * Verifica si un usuario tiene un permiso específico sobre un recurso
 */
export function hasPermission(
  resourceId: string,
  userDID: string,
  permissionType: PermissionType
): boolean {
  const permissions = loadPermissions();
  const resourcePermission = permissions.find(
    p => p.resourceId === resourceId && p.grantedToDID === userDID
  );
  
  if (!resourcePermission) return false;
  
  // Verificar si el permiso ha expirado
  if (resourcePermission.expiresAt && Date.now() > resourcePermission.expiresAt) {
    return false;
  }
  
  return resourcePermission.permissions.includes(permissionType);
}

/**
 * Obtiene estadísticas de permisos
 */
export function getPermissionsStats(ownerDID: string): {
  totalGranted: number;
  byModule: Record<string, number>;
  byType: Record<string, number>;
} {
  const permissions = getPermissionsByOwner(ownerDID);
  
  const byModule: Record<string, number> = {};
  const byType: Record<string, number> = {};
  
  permissions.forEach(permission => {
    // Contar por módulo
    byModule[permission.moduleOrigin] = (byModule[permission.moduleOrigin] || 0) + 1;
    
    // Contar por tipo de recurso
    byType[permission.resourceType] = (byType[permission.resourceType] || 0) + 1;
  });
  
  return {
    totalGranted: permissions.length,
    byModule,
    byType
  };
}
