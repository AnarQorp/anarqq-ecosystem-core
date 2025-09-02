// Common types for Q ecosystem modules

export interface MaskRule {
  field: string;
  strategy: 'REDACT' | 'HASH' | 'ENCRYPT' | 'ANONYMIZE' | 'REMOVE';
  params?: Record<string, any>;
}

export interface MaskProfile {
  name: string;
  rules: MaskRule[];
  defaults: Record<string, any>;
  version: string;
}

export interface IdentityRef {
  squidId: string;
  subId?: string;
  daoId?: string;
}

export interface ConsentRef {
  policyCid: string;
  scope: string;
  grant: string;
  exp: number;
}

export interface LockSig {
  alg: string;
  pub: string;
  sig: string;
  ts: number;
  nonce: string;
}

export interface IndexRecord {
  type: string;
  key: string;
  cid: string;
  version: number;
  prevCid?: string;
  tags: string[];
  createdAt: string;
}

export interface AuditEvent {
  type: string;
  ref: string;
  actor: IdentityRef;
  layer: string;
  verdict: 'ALLOW' | 'DENY' | 'WARN';
  details: Record<string, any>;
  cid?: string;
}