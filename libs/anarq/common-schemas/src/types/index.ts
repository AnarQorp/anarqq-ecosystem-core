/**
 * Index Record - Structure for indexing and pointer management
 */
export interface IndexRecord {
  /** Record type (e.g., 'file', 'message', 'transaction') */
  type: string;
  /** Index key for lookups */
  key: string;
  /** IPFS CID of the indexed content */
  cid: string;
  /** Record version number */
  version: number;
  /** Previous version CID for history tracking */
  prevCid?: string;
  /** Searchable tags */
  tags: string[];
  /** Record creation timestamp */
  createdAt: string;
  /** Optional record metadata */
  metadata?: Record<string, any>;
}

/**
 * Mutable Pointer - Structure for mutable references
 */
export interface MutablePointer {
  /** Pointer key identifier */
  key: string;
  /** Current CID being pointed to */
  currentCid: string;
  /** Current version number */
  version: number;
  /** Pointer creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Pointer owner identity */
  owner: string;
  /** Optional pointer metadata */
  metadata?: Record<string, any>;
}

/**
 * Query Filter - Structure for index queries
 */
export interface QueryFilter {
  /** Record type filter */
  type?: string;
  /** Tag filters (AND operation) */
  tags?: string[];
  /** Key pattern (supports wildcards) */
  keyPattern?: string;
  /** Date range filter */
  dateRange?: {
    from: string;
    to: string;
  };
  /** Metadata filters */
  metadata?: Record<string, any>;
  /** Result limit */
  limit?: number;
  /** Result offset for pagination */
  offset?: number;
}