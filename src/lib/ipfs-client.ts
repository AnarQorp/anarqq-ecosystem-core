import { create as createW3Client } from '@web3-storage/w3up-client'
import { Web3Storage } from 'web3.storage'
import { create as ipfsHttpClient } from 'ipfs-http-client'

type IPFSMode = 'local' | 'web3storage' | 'infura'

let ipfsClient: any = null
let storageClient: any = null

/**
 * Initialize IPFS client based on environment configuration
 */
export async function initIPFS() {
  if (ipfsClient) {
    console.log('✅ [IPFS] Using existing IPFS client')
    return ipfsClient
  }

  const mode = (import.meta.env.VITE_IPFS_MODE || 'local') as IPFSMode
  console.log(`🌐 [IPFS] Initializing in ${mode} mode`)

  try {
    switch (mode) {
      case 'web3storage':
        const token = import.meta.env.VITE_WEB3_STORAGE_TOKEN
        if (!token) {
          throw new Error('WEB3_STORAGE_TOKEN is required for web3storage mode')
        }
        storageClient = new Web3Storage({ token })
        ipfsClient = await createW3Client()
        break

      case 'local':
      default: {
        const apiUrl = import.meta.env.VITE_IPFS_API_URL || '/ip4/127.0.0.1/tcp/5001'
        const gatewayUrl = import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://localhost:8080/ipfs'
        
        console.log(`🔌 [IPFS] Connecting to local node at ${apiUrl}`)
        ipfsClient = ipfsHttpClient({ url: apiUrl })
        
        // Test connection
        try {
          const id = await ipfsClient.id()
          console.log('✅ [IPFS] Connected to local node:', id.id)
        } catch (error) {
          console.warn('⚠️ [IPFS] Could not connect to local IPFS node. Make sure IPFS is running.')
          console.warn('⚠️ [IPFS] You can install IPFS Desktop or run `ipfs daemon` in a terminal')
        }
        break
      }
    }

    return ipfsClient
  } catch (error) {
    console.error('❌ [IPFS] Failed to initialize IPFS client:', error)
    throw error
  }
}

/**
 * Upload file to IPFS
 */
export async function uploadToIPFS(file: File) {
  await initIPFS()
  
  try {
    console.log(`📤 [IPFS] Uploading file: ${file.name} (${file.size} bytes)`)
    
    if (storageClient) {
      // Using Web3.Storage
      const cid = await storageClient.put([file])
      console.log(`✅ [IPFS] File uploaded to Web3.Storage: ${cid}`)
      return cid
    } else if (ipfsClient) {
      // Using local IPFS node
      const result = await ipfsClient.add(file)
      console.log(`✅ [IPFS] File uploaded to local node: ${result.path}`)
      return result.path
    }
    
    throw new Error('No IPFS client available')
  } catch (error) {
    console.error('❌ [IPFS] Error uploading file:', error)
    throw error
  }
}

/**
 * Get file from IPFS
 */
export async function getFromIPFS(cid: string) {
  await initIPFS()
  
  try {
    console.log(`📥 [IPFS] Fetching file: ${cid}`)
    
    if (storageClient) {
      // Using Web3.Storage
      const response = await storageClient.get(cid)
      if (!response.ok) {
        throw new Error(`Failed to get file ${cid}: ${response.status}`)
      }
      return await response.files()
    } else if (ipfsClient) {
      // Using local IPFS node
      const chunks = []
      for await (const chunk of ipfsClient.cat(cid)) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    }
    
    throw new Error('No IPFS client available')
  } catch (error) {
    console.error(`❌ [IPFS] Error fetching file ${cid}:`, error)
    throw error
  }
}

export default {
  initIPFS,
  uploadToIPFS,
  getFromIPFS
}
