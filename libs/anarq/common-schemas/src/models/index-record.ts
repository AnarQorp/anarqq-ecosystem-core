/**
 * Index Record - Standard indexing record representation
 */
export interface IndexRecord {
  /** Type of the indexed resource */
  type: string;
  /** Unique key for the record */
  key: string;
  /** IPFS CID of the content */
  cid: string;
  /** Version number for the record */
  version: number;
  /** Previous version CID (for history tracking) */
  prevCid?: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Validates an IndexRecord object
 */
export function isValidIndexRecord(record: any): record is IndexRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    typeof record.type === 'string' &&
    record.type.length > 0 &&
    typeof record.key === 'string' &&
    record.key.length > 0 &&
    typeof record.cid === 'string' &&
    record.cid.length > 0 &&
    typeof record.version === 'number' &&
    record.version >= 0 &&
    (record.prevCid === undefined || typeof record.prevCid === 'string') &&
    Array.isArray(record.tags) &&
    record.tags.every((tag: any) => typeof tag === 'string') &&
    typeof record.createdAt === 'string' &&
    record.createdAt.length > 0
  );
}