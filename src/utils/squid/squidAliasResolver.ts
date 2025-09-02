
/**
 * sQuid Alias Resolver
 * Resolves user aliases to their corresponding DIDs
 */

import { getAllRegisteredIdentities } from '@/modules/squid/identityManager';
import { SquidIdentity } from '@/state/identity';

export interface UserSearchResult {
  alias: string;
  did: string;
  type: 'ROOT' | 'SUB' | 'AID';
  reputation: number;
  verified: boolean;
}

/**
 * Searches for users by alias (case-insensitive partial match)
 */
export async function searchUsersByAlias(query: string): Promise<UserSearchResult[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!query.trim()) {
    return [];
  }
  
  console.log(`[sQuid Alias Resolver] Buscando usuarios con alias: "${query}"`);
  
  try {
    // Get all registered identities
    const allIdentities = getAllRegisteredIdentities();
    
    // Filter by alias (case-insensitive partial match)
    const matches = allIdentities
      .filter(identity => 
        identity.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(identity => ({
        alias: identity.name,
        did: identity.did,
        type: identity.type,
        reputation: identity.reputation,
        verified: identity.kyc
      }))
      .slice(0, 10); // Limit to 10 results
    
    console.log(`[sQuid Alias Resolver] Encontrados ${matches.length} usuarios`);
    
    return matches;
    
  } catch (error) {
    console.error('[sQuid Alias Resolver] Error en búsqueda:', error);
    return [];
  }
}

/**
 * Gets exact user by alias
 */
export async function getUserByAlias(alias: string): Promise<UserSearchResult | null> {
  const results = await searchUsersByAlias(alias);
  return results.find(result => result.alias.toLowerCase() === alias.toLowerCase()) || null;
}

/**
 * Resolves an alias to its DID
 */
export async function resolveDID(alias: string): Promise<string | null> {
  const user = await getUserByAlias(alias);
  return user ? user.did : null;
}
