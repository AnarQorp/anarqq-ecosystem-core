/**
 * Enhanced sQuid Identity State Management
 * Manages active identity, subidentities, and identity trees with ecosystem integration
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { 
  ExtendedSquidIdentity, 
  IdentityTree, 
  IdentityTreeNode, 
  IdentityType,
  SubidentityMetadata,
  SubidentityResult,
  SwitchResult,
  DeleteResult,
  IdentityAction,
  AuditEntry,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel
} from '@/types/identity';
import { 
  storeIdentity,
  getIdentity,
  storeIdentities,
  getIdentitiesByRoot,
  storeIdentityTree,
  getIdentityTree,
  setActiveIdentity as setActiveIdentityStorage,
  getActiveIdentity as getActiveIdentityStorage,
  clearActiveIdentity as clearActiveIdentityStorage,
  removeIdentity as removeIdentityStorage,
  performStorageCleanup
} from '@/utils/storage/identityStorage';
import { 
  getCachedIdentity,
  getCachedIdentityTree,
  invalidateIdentityCache,
  invalidateTreeCache
} from '@/services/identity/IdentityCacheManager';
import { 
  optimizedIdentitySwitch,
  preloadIdentitiesForSwitch,
  getSwitchPredictions
} from '@/services/identity/IdentitySwitchOptimizer';

// Legacy interface for backward compatibility
export interface SquidIdentity {
  did: string;
  name: string;
  type: 'ROOT' | 'SUB';
  kyc: boolean;
  reputation: number;
  space?: string;
  qlock?: QlockEncryption;
  email?: string;
  avatar?: string;
  cid_profile?: string;
  createdAt?: string;
  lastLogin?: string;
  isAuthenticated?: boolean;
  token?: string;
  permissions?: string[];
  provider?: string;
  signMessage?: (message: string) => Promise<string>;
  encrypt?: (data: string) => Promise<string>;
  decrypt?: (encryptedData: string) => Promise<string>;
  getToken?: () => Promise<string>;
}

export interface QlockEncryption {
  encrypt(data: ArrayBuffer): Promise<ArrayBuffer>;
  decrypt(data: ArrayBuffer): Promise<ArrayBuffer>;
  getKey(): Promise<string>;
}

// Enhanced Identity State Interface
interface EnhancedIdentityState {
  // Core State
  activeIdentity: ExtendedSquidIdentity | null;
  identities: Map<string, ExtendedSquidIdentity>; // All identities by DID
  identityTree: IdentityTree | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Identity Management Actions
  setActiveIdentity: (identity: ExtendedSquidIdentity) => Promise<void>;
  createSubidentity: (metadata: SubidentityMetadata) => Promise<SubidentityResult>;
  deleteSubidentity: (identityId: string) => Promise<DeleteResult>;
  updateIdentity: (identityId: string, updates: Partial<ExtendedSquidIdentity>) => Promise<void>;

  // Identity Tree Management
  buildIdentityTree: (rootId: string) => Promise<void>;
  addToTree: (identity: ExtendedSquidIdentity) => void;
  removeFromTree: (identityId: string) => void;
  getIdentityById: (identityId: string) => ExtendedSquidIdentity | null;
  getChildIdentities: (parentId: string) => ExtendedSquidIdentity[];
  getRootIdentity: () => ExtendedSquidIdentity | null;

  // Persistence and Storage
  persistIdentityTree: () => Promise<void>;
  loadIdentityTree: () => Promise<void>;
  clearAllIdentities: () => void;

  // Audit and Security
  logIdentityAction: (identityId: string, action: IdentityAction, metadata?: any) => Promise<void>;
  addSecurityFlag: (identityId: string, flag: any) => void;

  // Legacy Compatibility
  setIdentity: (identity: SquidIdentity) => void;
  clearIdentity: () => void;
  initializeFromStorage: () => void;
}

// Utility functions for identity tree operations
function createIdentityTreeNode(identity: ExtendedSquidIdentity): IdentityTreeNode {
  return {
    identity,
    children: [],
    expanded: false
  };
}

function findNodeInTree(tree: IdentityTreeNode, identityId: string): IdentityTreeNode | null {
  if (tree.identity.did === identityId) {
    return tree;
  }
  
  for (const child of tree.children) {
    const found = findNodeInTree(child, identityId);
    if (found) return found;
  }
  
  return null;
}

function removeNodeFromTree(tree: IdentityTreeNode, identityId: string): boolean {
  for (let i = 0; i < tree.children.length; i++) {
    if (tree.children[i].identity.did === identityId) {
      tree.children.splice(i, 1);
      return true;
    }
    
    if (removeNodeFromTree(tree.children[i], identityId)) {
      return true;
    }
  }
  
  return false;
}

// Enhanced Zustand store with subidentity support
export const useIdentityStore = create<EnhancedIdentityState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Core State
        activeIdentity: null,
        identities: new Map<string, ExtendedSquidIdentity>(),
        identityTree: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        // Identity Management Actions
        setActiveIdentity: async (identity: ExtendedSquidIdentity) => {
          try {
            set({ loading: true, error: null });
            
            // Use optimized switching if available
            const currentIdentity = get().activeIdentity;
            if (currentIdentity && currentIdentity.did !== identity.did) {
              try {
                await optimizedIdentitySwitch(identity.did);
                set({ loading: false });
                return;
              } catch (optimizationError) {
                console.warn('[Enhanced sQuid State] Optimized switch failed, falling back to standard:', optimizationError);
                // Continue with standard switching
              }
            }
            
            // Standard identity switching
            const updatedIdentity = {
              ...identity,
              lastUsed: new Date().toISOString(),
              usageStats: {
                ...identity.usageStats,
                switchCount: (identity.usageStats?.switchCount || 0) + 1,
                lastSwitch: new Date().toISOString()
              }
            };

            // Update in identities map
            const identities = new Map(get().identities);
            identities.set(identity.did, updatedIdentity);

            set({ 
              activeIdentity: updatedIdentity,
              identities,
              isAuthenticated: true,
              loading: false
            });

            // Store in persistent storage
            await storeIdentity(updatedIdentity);
            setActiveIdentityStorage(updatedIdentity);

            // Log the identity switch
            await get().logIdentityAction(identity.did, IdentityAction.SWITCHED, {
              previousIdentity: currentIdentity?.did,
              timestamp: new Date().toISOString()
            });

            // Trigger predictive preloading for related identities
            if (currentIdentity) {
              const predictions = getSwitchPredictions(identity.did);
              const predictedIds = predictions.slice(0, 3).map(p => p.identityId);
              if (predictedIds.length > 0) {
                preloadIdentitiesForSwitch(predictedIds).catch(error => {
                  console.warn('[Enhanced sQuid State] Predictive preloading failed:', error);
                });
              }
            }

            console.log(`[Enhanced sQuid State] Active identity set: ${identity.did}`);
            console.log(`[Enhanced sQuid State] Identity type: ${identity.type}`);
            
          } catch (error) {
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to set active identity' 
            });
            throw error;
          }
        },

        createSubidentity: async (metadata: SubidentityMetadata): Promise<SubidentityResult> => {
          try {
            set({ loading: true, error: null });
            
            const activeIdentity = get().activeIdentity;
            if (!activeIdentity) {
              throw new Error('No active identity to create subidentity from');
            }

            // Generate new identity
            const now = new Date().toISOString();
            const newIdentity: ExtendedSquidIdentity = {
              did: `did:squid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: metadata.name,
              type: metadata.type,
              parentId: activeIdentity.did,
              rootId: activeIdentity.rootId || activeIdentity.did,
              children: [],
              depth: activeIdentity.depth + 1,
              path: [...activeIdentity.path, activeIdentity.did],
              governanceLevel: metadata.type === IdentityType.DAO ? GovernanceType.DAO : 
                              metadata.type === IdentityType.CONSENTIDA ? GovernanceType.PARENT : 
                              GovernanceType.SELF,
              creationRules: {
                type: metadata.type,
                parentType: activeIdentity.type,
                requiresKYC: metadata.type === IdentityType.DAO || metadata.type === IdentityType.AID,
                requiresDAOGovernance: metadata.type === IdentityType.ENTERPRISE,
                requiresParentalConsent: metadata.type === IdentityType.CONSENTIDA,
                maxDepth: 3,
                allowedChildTypes: metadata.type === IdentityType.CONSENTIDA ? [] : [IdentityType.CONSENTIDA, IdentityType.AID]
              },
              permissions: {
                canCreateSubidentities: metadata.type !== IdentityType.CONSENTIDA && metadata.type !== IdentityType.AID,
                canDeleteSubidentities: true,
                canModifyProfile: true,
                canAccessModule: () => true,
                canPerformAction: () => true,
                governanceLevel: metadata.type === IdentityType.DAO ? GovernanceType.DAO : GovernanceType.SELF
              },
              status: IdentityStatus.ACTIVE,
              qonsentProfileId: `qonsent-${Date.now()}`,
              qlockKeyPair: {
                publicKey: `pub-${Date.now()}`,
                privateKey: `priv-${Date.now()}`,
                algorithm: 'ECDSA',
                keySize: 256,
                createdAt: now
              },
              privacyLevel: metadata.privacyLevel || PrivacyLevel.PRIVATE,
              avatar: metadata.avatar,
              description: metadata.description,
              tags: metadata.tags || [],
              createdAt: now,
              updatedAt: now,
              lastUsed: now,
              kyc: {
                required: metadata.type === IdentityType.DAO || metadata.type === IdentityType.AID,
                submitted: false,
                approved: false
              },
              auditLog: [],
              securityFlags: [],
              qindexRegistered: false,
              usageStats: {
                switchCount: 0,
                lastSwitch: now,
                modulesAccessed: [],
                totalSessions: 0
              }
            };

            // Add to identities map
            const identities = new Map(get().identities);
            identities.set(newIdentity.did, newIdentity);

            // Update parent's children array
            const parentIdentity = identities.get(activeIdentity.did);
            if (parentIdentity) {
              parentIdentity.children.push(newIdentity.did);
              identities.set(parentIdentity.did, parentIdentity);
              // Store updated parent
              await storeIdentity(parentIdentity);
            }

            // Store new identity in persistent storage
            await storeIdentity(newIdentity);

            // Add to tree
            get().addToTree(newIdentity);

            // Invalidate tree cache since structure changed
            if (activeIdentity.rootId) {
              invalidateTreeCache(activeIdentity.rootId);
            }

            set({ identities, loading: false });

            // Log creation
            await get().logIdentityAction(newIdentity.did, IdentityAction.CREATED, {
              parentId: activeIdentity.did,
              type: metadata.type,
              timestamp: now
            });

            console.log(`[Enhanced sQuid State] Subidentity created: ${newIdentity.did}`);
            
            return { success: true, identity: newIdentity };
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create subidentity';
            set({ loading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        deleteSubidentity: async (identityId: string): Promise<DeleteResult> => {
          try {
            set({ loading: true, error: null });
            
            const identities = new Map(get().identities);
            const identity = identities.get(identityId);
            
            if (!identity) {
              throw new Error('Identity not found');
            }

            if (identity.type === IdentityType.ROOT) {
              throw new Error('Cannot delete root identity');
            }

            // Collect affected children
            const affectedChildren: string[] = [];
            const collectChildren = (id: string) => {
              const current = identities.get(id);
              if (current) {
                current.children.forEach(childId => {
                  affectedChildren.push(childId);
                  collectChildren(childId);
                });
              }
            };
            collectChildren(identityId);

            // Remove from parent's children array
            if (identity.parentId) {
              const parent = identities.get(identity.parentId);
              if (parent) {
                parent.children = parent.children.filter(id => id !== identityId);
                identities.set(parent.did, parent);
              }
            }

            // Remove identity and all children from persistent storage
            await removeIdentityStorage(identityId);
            await Promise.all(affectedChildren.map(childId => removeIdentityStorage(childId)));

            // Remove identity and all children from memory
            identities.delete(identityId);
            affectedChildren.forEach(childId => identities.delete(childId));

            // Remove from tree
            get().removeFromTree(identityId);

            // If deleting active identity, switch to parent or root
            const activeIdentity = get().activeIdentity;
            if (activeIdentity?.did === identityId) {
              const parent = identity.parentId ? identities.get(identity.parentId) : null;
              const root = get().getRootIdentity();
              const newActive = parent || root;
              
              if (newActive) {
                await get().setActiveIdentity(newActive);
              } else {
                set({ activeIdentity: null, isAuthenticated: false });
              }
            }

            set({ identities, loading: false });

            // Log deletion
            await get().logIdentityAction(identityId, IdentityAction.DELETED, {
              affectedChildren,
              timestamp: new Date().toISOString()
            });

            console.log(`[Enhanced sQuid State] Identity deleted: ${identityId}`);
            
            return { 
              success: true, 
              deletedIdentity: identity, 
              affectedChildren 
            };
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete identity';
            set({ loading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        updateIdentity: async (identityId: string, updates: Partial<ExtendedSquidIdentity>) => {
          try {
            const identities = new Map(get().identities);
            const identity = identities.get(identityId);
            
            if (!identity) {
              throw new Error('Identity not found');
            }

            const updatedIdentity = {
              ...identity,
              ...updates,
              updatedAt: new Date().toISOString()
            };

            identities.set(identityId, updatedIdentity);
            
            // Update active identity if it's the one being updated
            const activeIdentity = get().activeIdentity;
            if (activeIdentity?.did === identityId) {
              set({ activeIdentity: updatedIdentity });
            }

            set({ identities });

            // Invalidate cache for updated identity
            invalidateIdentityCache(identityId);

            await get().logIdentityAction(identityId, IdentityAction.UPDATED, {
              updates,
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            console.error('Failed to update identity:', error);
            throw error;
          }
        },

        // Identity Tree Management
        buildIdentityTree: async (rootId: string) => {
          try {
            const identities = get().identities;
            const rootIdentity = identities.get(rootId);
            
            if (!rootIdentity) {
              throw new Error('Root identity not found');
            }

            const buildNode = (identity: ExtendedSquidIdentity): IdentityTreeNode => {
              const node = createIdentityTreeNode(identity);
              
              identity.children.forEach(childId => {
                const child = identities.get(childId);
                if (child) {
                  const childNode = buildNode(child);
                  childNode.parent = node;
                  node.children.push(childNode);
                }
              });
              
              return node;
            };

            const tree: IdentityTree = {
              root: buildNode(rootIdentity),
              totalNodes: identities.size,
              maxDepth: Math.max(...Array.from(identities.values()).map(i => i.depth)),
              lastUpdated: new Date().toISOString()
            };

            set({ identityTree: tree });
            
          } catch (error) {
            console.error('Failed to build identity tree:', error);
            throw error;
          }
        },

        addToTree: (identity: ExtendedSquidIdentity) => {
          const tree = get().identityTree;
          if (!tree) return;

          const newNode = createIdentityTreeNode(identity);
          
          if (identity.parentId) {
            const parentNode = findNodeInTree(tree.root, identity.parentId);
            if (parentNode) {
              newNode.parent = parentNode;
              parentNode.children.push(newNode);
            }
          }

          set({ 
            identityTree: {
              ...tree,
              totalNodes: tree.totalNodes + 1,
              maxDepth: Math.max(tree.maxDepth, identity.depth),
              lastUpdated: new Date().toISOString()
            }
          });
        },

        removeFromTree: (identityId: string) => {
          const tree = get().identityTree;
          if (!tree) return;

          const removed = removeNodeFromTree(tree.root, identityId);
          
          if (removed) {
            set({ 
              identityTree: {
                ...tree,
                totalNodes: tree.totalNodes - 1,
                lastUpdated: new Date().toISOString()
              }
            });
          }
        },

        getIdentityById: async (identityId: string) => {
          // First check in-memory store
          const memoryIdentity = get().identities.get(identityId);
          if (memoryIdentity) {
            return memoryIdentity;
          }

          // Try cached version
          try {
            const cachedIdentity = await getCachedIdentity(identityId);
            if (cachedIdentity) {
              // Add to in-memory store
              const identities = new Map(get().identities);
              identities.set(identityId, cachedIdentity);
              set({ identities });
              return cachedIdentity;
            }
          } catch (error) {
            console.error(`Failed to get cached identity ${identityId}:`, error);
          }

          return null;
        },

        getChildIdentities: (parentId: string) => {
          const identities = get().identities;
          return Array.from(identities.values()).filter(identity => identity.parentId === parentId);
        },

        getRootIdentity: () => {
          const identities = get().identities;
          return Array.from(identities.values()).find(identity => identity.type === IdentityType.ROOT) || null;
        },

        // Persistence and Storage
        persistIdentityTree: async () => {
          try {
            const state = get();
            
            // Store all identities in persistent storage
            const identitiesArray = Array.from(state.identities.values());
            await storeIdentities(identitiesArray);
            
            // Store identity tree if it exists
            if (state.identityTree) {
              await storeIdentityTree(state.identityTree);
            }
            
            console.log('[Enhanced sQuid State] Identity tree persisted to storage');
            
          } catch (error) {
            console.error('Failed to persist identity tree:', error);
          }
        },

        loadIdentityTree: async () => {
          try {
            // Try to load active identity from session storage first
            const activeIdentity = getActiveIdentityStorage();
            
            if (activeIdentity) {
              // Load the complete identity tree for the root identity
              const rootId = activeIdentity.rootId || activeIdentity.did;
              const identitiesArray = await getIdentitiesByRoot(rootId);
              
              // Convert to Map
              const identities = new Map<string, ExtendedSquidIdentity>();
              identitiesArray.forEach(identity => {
                identities.set(identity.did, identity);
              });
              
              // Try to load cached tree
              const cachedTree = await getIdentityTree(rootId);
              
              set({
                identities,
                identityTree: cachedTree,
                activeIdentity,
                isAuthenticated: true
              });
              
              // If no cached tree, rebuild it
              if (!cachedTree && identities.size > 0) {
                await get().buildIdentityTree(rootId);
              }
              
              console.log(`[Enhanced sQuid State] Loaded ${identities.size} identities from storage`);
            }
            
          } catch (error) {
            console.error('Failed to load identity tree:', error);
          }
        },

        clearAllIdentities: async () => {
          try {
            // Clear from persistent storage
            const { clearAllIdentityStorage } = await import('@/utils/storage/identityStorage');
            await clearAllIdentityStorage();
            
            // Clear from memory
            set({
              activeIdentity: null,
              identities: new Map(),
              identityTree: null,
              isAuthenticated: false,
              loading: false,
              error: null
            });
            
            console.log('[Enhanced sQuid State] All identities cleared');
          } catch (error) {
            console.error('Failed to clear all identities:', error);
          }
        },

        // Audit and Security
        logIdentityAction: async (identityId: string, action: IdentityAction, metadata?: any) => {
          try {
            const auditEntry: AuditEntry = {
              id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              identityId,
              action,
              timestamp: new Date().toISOString(),
              metadata: {
                ...metadata,
                triggeredBy: get().activeIdentity?.did || 'system',
                securityLevel: 'MEDIUM'
              }
            };

            const identities = new Map(get().identities);
            const identity = identities.get(identityId);
            
            if (identity) {
              identity.auditLog.push(auditEntry);
              identities.set(identityId, identity);
              set({ identities });
            }

            console.log(`[Enhanced sQuid State] Audit log entry created:`, auditEntry);
            
          } catch (error) {
            console.error('Failed to log identity action:', error);
          }
        },

        addSecurityFlag: (identityId: string, flag: any) => {
          const identities = new Map(get().identities);
          const identity = identities.get(identityId);
          
          if (identity) {
            identity.securityFlags.push(flag);
            identities.set(identityId, identity);
            set({ identities });
          }
        },

        // Legacy Compatibility
        setIdentity: (identity: SquidIdentity) => {
          // Convert legacy identity to extended format
          const extendedIdentity: ExtendedSquidIdentity = {
            did: identity.did,
            name: identity.name,
            type: identity.type === 'ROOT' ? IdentityType.ROOT : IdentityType.DAO,
            rootId: identity.did,
            children: [],
            depth: 0,
            path: [],
            governanceLevel: GovernanceType.SELF,
            creationRules: {
              type: identity.type === 'ROOT' ? IdentityType.ROOT : IdentityType.DAO,
              requiresKYC: identity.kyc,
              requiresDAOGovernance: false,
              requiresParentalConsent: false,
              maxDepth: 3,
              allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
            },
            permissions: {
              canCreateSubidentities: true,
              canDeleteSubidentities: true,
              canModifyProfile: true,
              canAccessModule: () => true,
              canPerformAction: () => true,
              governanceLevel: GovernanceType.SELF
            },
            status: IdentityStatus.ACTIVE,
            qonsentProfileId: `qonsent-${identity.did}`,
            qlockKeyPair: {
              publicKey: `pub-${identity.did}`,
              privateKey: `priv-${identity.did}`,
              algorithm: 'ECDSA',
              keySize: 256,
              createdAt: identity.createdAt || new Date().toISOString()
            },
            privacyLevel: PrivacyLevel.PUBLIC,
            tags: [],
            createdAt: identity.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            kyc: {
              required: identity.kyc,
              submitted: identity.kyc,
              approved: identity.kyc
            },
            auditLog: [],
            securityFlags: [],
            qindexRegistered: false,
            // Legacy fields
            space: identity.space,
            email: identity.email,
            avatar: identity.avatar,
            cid_profile: identity.cid_profile,
            reputation: identity.reputation,
            isAuthenticated: identity.isAuthenticated,
            token: identity.token,
            provider: identity.provider,
            signMessage: identity.signMessage,
            encrypt: identity.encrypt,
            decrypt: identity.decrypt,
            getToken: identity.getToken
          };

          get().setActiveIdentity(extendedIdentity);
        },

        clearIdentity: () => {
          set({ 
            activeIdentity: null, 
            isAuthenticated: false 
          });
          console.log('[Enhanced sQuid State] Identity cleared');
        },

        initializeFromStorage: () => {
          get().loadIdentityTree();
        }
      }),
      {
        name: 'enhanced-squid-identity-storage',
        partialize: (state) => ({
          activeIdentity: state.activeIdentity,
          isAuthenticated: state.isAuthenticated,
          identities: Array.from(state.identities.entries())
          // Exclude identityTree from persistence to avoid circular references
        }),
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.identities)) {
            state.identities = new Map(state.identities);
            // Rebuild tree after rehydration if we have a root identity
            const rootIdentity = Array.from(state.identities.values()).find(i => i.type === 'ROOT');
            if (rootIdentity) {
              // Rebuild tree asynchronously
              setTimeout(() => {
                useIdentityStore.getState().buildIdentityTree(rootIdentity.did);
              }, 0);
            }
          }
        }
      }
    )
  )
);

/**
 * Función helper para obtener el DID activo (usada por otros módulos)
 */
export function getActiveDID(): string | null {
  const { activeIdentity } = useIdentityStore.getState();
  return activeIdentity?.did || null;
}

/**
 * Función helper para obtener la identidad completa activa
 */
export function getActiveIdentity(): SquidIdentity | null {
  const { activeIdentity } = useIdentityStore.getState();
  return activeIdentity;
}

/**
 * Función helper para verificar si hay una identidad autenticada
 */
export function isUserAuthenticated(): boolean {
  const { isAuthenticated } = useIdentityStore.getState();
  return isAuthenticated;
}

/**
 * Función helper para obtener el email interno de QMail
 */
export function getActiveQMailAddress(): string | null {
  const identity = getActiveIdentity();
  return identity ? `${identity.name}@qmail.anarq` : null;
}

/**
 * Genera clave AES desde el DID activo para Qlock
 */
export async function generateAESKeyFromActiveDID(): Promise<string | null> {
  const did = getActiveDID();
  if (!did) return null;
  
  // Simulación de SHA256 (en producción usaría crypto.subtle.digest)
  const encoder = new TextEncoder();
  const data = encoder.encode(did);
  
  // Hash simple para demo
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Generar clave AES de 32 caracteres
  const aesKey = Math.abs(hash).toString(16).padStart(16, '0').repeat(2);
  
  console.log(`[sQuid State] Clave AES generada para DID: ${did.slice(0, 16)}...`);
  return aesKey;
}

/**
 * Inicializar el store al cargar la aplicación
 */
export function initializeIdentityStore() {
  const { initializeFromStorage } = useIdentityStore.getState();
  initializeFromStorage();
}
