// Define the minimal Storacha client interface we need
type StorachaClient = {
  uploadFile: (file: File, options: { 
    onProgress?: (progress: number) => void;
    metadata?: Record<string, any>;
  }) => Promise<string>;
  getGatewayUrl: (cid: string) => string;
  addSpace: (proof: any) => Promise<void>;
  setCurrentSpace: (spaceDID: string) => Promise<void>;
  currentSpace: () => string | null;
};

type UseSessionResult = {
  session: {
    user?: {
      did: string;
      [key: string]: any;
    };
  };
};

// In-memory store for the UCAN client instance
let storachaClient: StorachaClient | null = null;
let currentSpaceDID: string | null = null;

/**
 * Initialize the Storacha client with UCAN delegation
 */
export const useStorachaClient = () => {
  // Mock session for now - in a real app, this would come from your auth context
  const session: UseSessionResult = {
    session: {
      user: {
        did: 'did:example:test-user',
      },
    },
  };
  
  // Mock client initialization
  const client = (() => {
    if (!session?.session?.user?.did) {
      console.log('[UCAN] No user session or DID found');
      return null;
    }

    // Return existing client if already initialized
    if (storachaClient) {
      return storachaClient;
    }

    // In a real implementation, this would initialize the Storacha client
    // For now, we'll return a mock implementation
    const mockClient: StorachaClient = {
      uploadFile: async (file, options) => {
        console.log('[MOCK] Uploading file:', file.name);
        // Simulate upload progress
        if (options.onProgress) {
          for (let i = 0; i <= 100; i += 10) {
            setTimeout(() => options.onProgress?.(i), i * 10);
          }
        }
        // Return a mock CID
        return `bafy${Math.random().toString(36).substring(2, 15)}`;
      },
      getGatewayUrl: (cid) => {
        return `https://ipfs.io/ipfs/${cid}`;
      },
      addSpace: async (proof) => {
        console.log('[MOCK] Adding space with proof:', proof);
      },
      setCurrentSpace: async (spaceDID) => {
        currentSpaceDID = spaceDID;
        console.log('[MOCK] Set current space to:', spaceDID);
      },
      currentSpace: () => currentSpaceDID,
    };

    storachaClient = mockClient;
    return storachaClient;
  })();

  /**
   * Get or create user space
   */
  const getOrCreateSpace = async (): Promise<string> => {
    if (!client || !session?.session?.user?.did) {
      throw new Error('Client not initialized or user not authenticated');
    }

    // Return existing space if already set
    const existingSpace = client.currentSpace();
    if (existingSpace) {
      return existingSpace;
    }

    try {
      // Request UCAN delegation from the backend
      console.log('[UCAN] Requesting UCAN delegation for DID:', session.session.user.did);
      
      // In a real implementation, this would call your backend API
      // For now, we'll simulate a successful response
      const mockResponse = {
        proof: `mock-ucan-proof-${Math.random().toString(36).substring(2, 10)}`,
        spaceDID: `did:space:mock-${Math.random().toString(36).substring(2, 10)}`
      };
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { proof, spaceDID } = mockResponse;
      
      // Add the space using the UCAN proof
      await client.addSpace(proof);
      await client.setCurrentSpace(spaceDID);
      
      console.log('[UCAN] Initialized space with DID:', spaceDID);
      return spaceDID;
      
    } catch (error) {
      console.error('[UCAN] Error initializing space:', error);
      throw new Error(
        `Failed to initialize space: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return {
    client,
    getOrCreateSpace,
    currentSpace: () => client?.currentSpace() || null,
  };
};

export default useStorachaClient;
