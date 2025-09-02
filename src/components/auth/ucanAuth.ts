import { Signer } from '@ucanto/principal/ed25519'
import * as UCAN from '@ucanto/interface'

// Audience DID (the server's DID)
const AUDIENCE_DID = 'did:web:anarq.coyotedron.com'

// Create a new signer with a new keypair
async function createSigner() {
  return await Signer.generate()
}

/**
 * Creates a UCAN token for authentication
 * @returns {Promise<string>} The base64url-encoded UCAN token
 */
async function createUCAN() {
  try {
    const signer = await createSigner()
    const issuer = signer.did()
    
    // Create expiration time (current time + 5 minutes)
    const expiration = Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes from now
    
    // For now, we'll return a simple token structure
    // In a real implementation, we would create a proper UCAN token here
    const token = JSON.stringify({
      iss: issuer,
      aud: AUDIENCE_DID,
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      cap: [
        {
          can: 'access/login',
          with: issuer
        }
      ]
    })
    
    // Return the encoded UCAN token
    return token.toString()
  } catch (error) {
    console.error('Error creating UCAN:', error)
    throw new Error('Failed to create UCAN token')
  }
}

/**
 * Sends the UCAN token to the server for verification
 * @param {string} token - The UCAN token to verify
 * @returns {Promise<any>} The server response
 */
async function verifyUCANWithBackend(token) {
  try {
    const response = await fetch('/api/auth/ucan-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ucan: token }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to verify UCAN')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error verifying UCAN with backend:', error)
    throw error
  }
}

/**
 * Main function to handle UCAN login flow
 * @returns {Promise<Object>} The login result
 */
export async function loginWithUCAN() {
  try {
    // 1. Create a UCAN token
    const token = await createUCAN()
    
    // 2. Send to backend for verification
    const result = await verifyUCANWithBackend(token)
    
    // 3. Log the response
    console.log('UCAN login response:', result)
    
    // 4. Return the result
    return result
  } catch (error) {
    console.error('UCAN login failed:', error)
    throw error
  }
}

export default loginWithUCAN
