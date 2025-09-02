
import { create as createClient } from '@web3-storage/w3up-client'

let client: any

export async function initClient() {
  if (client) {
    console.log('✅ Cliente ya existe, reutilizando...')
    return client
  }

  try {
    console.log('🆕 Creando cliente nuevo...')
    
    // Crear cliente de forma simple
    console.log('🔄 Llamando a createClient()...')
    client = await createClient()
    console.log('🔄 createClient() completado')
    
    console.log('🔍 Cliente creado, verificando propiedades...')
    console.log('🔧 Tipo de cliente:', typeof client)
    console.log('🔧 Cliente tiene propiedades:', Object.keys(client || {}))
    
    if (!client) {
      throw new Error('El cliente es null o undefined')
    }
    
    console.log('🔄 Verificando agent...')
    console.log('🔧 Tipo de agent:', typeof client.agent)
    
    if (!client.agent) {
      throw new Error('No se pudo crear el agente del cliente')
    }
    
    // El problema está aquí - necesitamos verificar si el principal existe
    console.log('🔄 Verificando principal...')
    console.log('🔧 Tipo de principal:', typeof client.agent.principal)
    console.log('🔧 Principal existe:', !!client.agent.principal)
    
    // Si no existe principal, necesitamos crearlo o usar una identidad
    if (!client.agent.principal) {
      console.log('🔧 Principal no existe, intentando obtener identidad por defecto...')
      
      // Intentar obtener la identidad por defecto del agente
      try {
        // En w3up-client, el principal debería estar disponible después de crear el cliente
        // Si no está, puede ser que necesitemos esperar o hay un problema de inicialización
        console.log('🔧 Propiedades del agent:', Object.keys(client.agent || {}))
        
        // Verificar si existe una forma alternativa de acceder al principal
        if (client.agent.issuer) {
          console.log('🔧 Usando issuer como alternativa al principal')
          const agentDid = client.agent.issuer.did()
          console.log('🔑 DID del issuer:', agentDid)
          
          if (agentDid) {
            console.log('🔑 Cliente creado exitosamente con issuer DID:', agentDid)
            console.log('📋 Para autorizar, ejecuta en terminal:')
            console.log(`w3 space authorize ${agentDid}`)
            return client
          }
        }
        
        throw new Error('No se pudo obtener identidad del agente')
      } catch (identityError: any) {
        console.error('❌ Error obteniendo identidad:', identityError)
        throw new Error('No se pudo crear el principal del agente')
      }
    }
    
    console.log('🔄 Obteniendo DID...')
    const agentDid = client.agent.principal.did()
    console.log('🔧 DID obtenido:', agentDid)
    console.log('🔧 Tipo de DID:', typeof agentDid)
    
    if (!agentDid) {
      throw new Error('No se pudo obtener el DID del agente')
    }
    
    console.log('🔑 Cliente creado exitosamente con DID:', agentDid)
    console.log('📋 Para autorizar, ejecuta en terminal:')
    console.log(`w3 space authorize ${agentDid}`)

    return client
  } catch (error: any) {
    console.error('❌ Error detallado al crear cliente:', error)
    console.error('❌ Mensaje del error:', error.message)
    console.error('❌ Stack trace:', error.stack)
    console.error('❌ Estado del cliente en error:', client)
    client = null
    throw new Error(`Error al inicializar cliente: ${error.message}`)
  }
}

export async function createAndSetSpace() {
  console.log('🎯 Iniciando createAndSetSpace...')
  
  try {
    const client = await initClient()
    
    console.log('🔍 Verificando espacio actual...')
    let space = await client.currentSpace()
    console.log('📍 Espacio actual:', space ? space.did() : 'null')
    
    if (!space) {
      console.log('🏗️ Creando nuevo espacio...')
      
      // Usar issuer si principal no está disponible
      let agentDid
      if (client.agent.principal) {
        agentDid = client.agent.principal.did()
        console.log('🔐 Agent DID (principal):', agentDid)
      } else if (client.agent.issuer) {
        agentDid = client.agent.issuer.did()
        console.log('🔐 Agent DID (issuer):', agentDid)
      } else {
        throw new Error('No se pudo obtener el DID del agente')
      }
      
      space = await client.createSpace('AnarQ-Space')
      console.log('✅ Espacio creado:', space.did())
      
      console.log('🎯 Estableciendo espacio actual...')
      await client.setCurrentSpace(space.did())
      console.log('✅ Espacio establecido')
    } else {
      console.log('✅ Usando espacio existente:', space.did())
    }
    
    return space
    
  } catch (error: any) {
    console.error('❌ Error en createAndSetSpace:', error)
    
    if (error.message?.includes('Unauthorized') || 
        error.message?.includes('proof') ||
        error.message?.includes('not authorized')) {
      // Usar issuer si principal no está disponible para el mensaje de error
      let agentDid = 'DID_NO_DISPONIBLE'
      if (client?.agent?.principal) {
        agentDid = client.agent.principal.did()
      } else if (client?.agent?.issuer) {
        agentDid = client.agent.issuer.did()
      }
      
      throw new Error(
        `❌ AGENTE NO AUTORIZADO\n\n` +
        `Ejecuta en terminal:\nw3 space authorize ${agentDid}\n\n` +
        `Error: ${error.message}`
      )
    }
    
    throw error
  }
}

export async function uploadBrowserFile(file: File): Promise<string> {
  try {
    console.log('📤 Iniciando subida:', file.name, `(${file.size} bytes)`)
    
    const client = await initClient()
    await createAndSetSpace()
    
    const space = await client.currentSpace()
    if (!space) {
      throw new Error('❌ No se pudo configurar el espacio')
    }

    console.log('📤 Subiendo archivo...')
    const cid = await client.uploadFile(file)
    console.log('✅ Archivo subido con CID:', cid.toString())
    
    return cid.toString()
  } catch (error: any) {
    console.error('❌ Error en uploadBrowserFile:', error)
    throw error
  }
}

export async function clearStorageAndReload() {
  console.log('🧹 Limpiando storage...')
  
  if (typeof window !== 'undefined') {
    // Limpiar localStorage relacionado con w3up
    Object.keys(localStorage).forEach(key => {
      if (key.includes('w3') || key.includes('ucanto') || key.includes('web3')) {
        localStorage.removeItem(key)
      }
    })
    
    // Limpiar sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('w3') || key.includes('ucanto') || key.includes('web3')) {
        sessionStorage.removeItem(key)
      }
    })
    
    // Limpiar IndexedDB
    try {
      const dbNames = ['keystore', 'w3up-client', 'ucanto']
      for (const dbName of dbNames) {
        indexedDB.deleteDatabase(dbName)
      }
    } catch (e) {
      console.log('Error limpiando IndexedDB:', e)
    }
  }
  
  client = null
  
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

export async function claimCID(cid: string, identity?: string): Promise<void> {
  console.log(`🔐 Future: Claiming CID ${cid} for identity ${identity || 'anonymous'}`)
}

export function isValidCID(cid: string): boolean {
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[2-7a-z]{50,})$/.test(cid)
}
