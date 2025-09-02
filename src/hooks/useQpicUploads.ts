import { useState, useEffect, useCallback } from 'react';
import { useIdentityStore } from '@/state/identity';
import { useSessionContext } from '@/contexts/SessionContext';

interface QpicUpload {
  cid: string;
  name: string;
  type: string;
  size: number;
  timestamp: string;
  cid_profile?: string;
  metadata: {
    isEncrypted?: boolean;
    fileHash?: string;
    source?: string;
    [key: string]: any;
  };
}

interface UseQpicUploadsProps {
  includeQpic?: boolean;
  filter?: {
    source?: string[];
    isEncrypted?: boolean;
  };
}

export function useQpicUploads({ 
  includeQpic = true, 
  filter = {} 
}: UseQpicUploadsProps = {}) {
  const { activeIdentity } = useIdentityStore();
  const { cid_profile } = useSessionContext();
  const [uploads, setUploads] = useState<QpicUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUploads = useCallback(async () => {
    if (!activeIdentity?.did) {
      setUploads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/qindex/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { term: { 'metadata.did': activeIdentity.did } },
                ...(includeQpic ? [] : [{ term: { 'metadata.source': 'qpic' } }]),
                ...(filter.source ? [{ terms: { 'metadata.source': filter.source } }] : []),
                ...(filter.isEncrypted !== undefined 
                  ? [{ term: { 'metadata.isEncrypted': filter.isEncrypted } }] 
                  : [])
              ].filter(Boolean)
            }
          },
          sort: [{ timestamp: 'desc' }],
          size: 100
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch uploads');
      }

      const { hits } = await response.json();
      const formattedUploads = hits.map((hit: any) => ({
        cid: hit._source.cid,
        name: hit._source.metadata?.name || `file_${hit._source.cid.slice(0, 8)}`,
        type: hit._source.metadata?.type || 'application/octet-stream',
        size: hit._source.metadata?.size || 0,
        timestamp: hit._source.timestamp,
        cid_profile: hit._source.metadata?.cid_profile,
        metadata: {
          ...hit._source.metadata,
          isEncrypted: hit._source.metadata?.isEncrypted || false,
          fileHash: hit._source.metadata?.fileHash
        }
      }));

      setUploads(formattedUploads);
    } catch (err) {
      console.error('Error fetching uploads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch uploads'));
    } finally {
      setLoading(false);
    }
  }, [activeIdentity?.did, includeQpic, filter]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const refresh = useCallback(() => {
    return fetchUploads();
  }, [fetchUploads]);

  return { uploads, loading, error, refresh };
}
