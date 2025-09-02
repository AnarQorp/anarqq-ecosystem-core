
/**
 * Utilidad para manejar el DID raíz y el DID activo en sessionStorage.
 */

const ROOT_KEY = "anarqq_root_did";
const ACTIVE_KEY = "anarqq_active_did";

export function setIdentitySession({ root, active }: { root: string, active: string }) {
  sessionStorage.setItem(ROOT_KEY, root);
  sessionStorage.setItem(ACTIVE_KEY, active);
}

export function getRootDID(): string | null {
  return sessionStorage.getItem(ROOT_KEY);
}

export function getActiveDID(): string | null {
  return sessionStorage.getItem(ACTIVE_KEY);
}

export function clearIdentitySession() {
  sessionStorage.removeItem(ROOT_KEY);
  sessionStorage.removeItem(ACTIVE_KEY);
}
