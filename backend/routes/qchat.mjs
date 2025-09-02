
import expressPkg from 'express';
import { Web3Storage } from 'web3.storage';
// Importación temporalmente comentada para desarrollo
// import { verifySignature } from '@ceramicnetwork/3id-did-resolver';

// Router para la ruta /qchat
const router = expressPkg.Router();

// Almacenamiento temporal en memoria (en producción usar base de datos)
const messageStore = new Map();

// Configuración de Web3.Storage (IPFS)
const web3Storage = new Web3Storage({
  token: process.env.WEB3_STORAGE_TOKEN || ''
});

/**
 * Middleware para validar firmas DID
 */
const validateDIDAuth = async (req, res, next) => {
  try {
    const { did, signature, message } = req.body;
    
    if (!did || !signature || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Verificación de firma temporalmente deshabilitada para desarrollo
    // const isVerified = await verifySignature(did, message, signature);
    // 
    // if (!isVerified) {
    //   return res.status(401).json({ error: 'Firma inválida' });
    // }
    
    console.log('Advertencia: Verificación de firma DID deshabilitada - Modo desarrollo');
    next();
  } catch (error) {
    console.error('Error en validación DID:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

/**
 * Enviar mensaje
 */
router.post('/messages', validateDIDAuth, async (req, res) => {
  try {
    const { senderDID, recipientDID, encryptedContent, metadata = {} } = req.body;
    
    // Validación básica
    if (!senderDID || !recipientDID || !encryptedContent) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderDID,
      recipientDID,
      encryptedContent,
      metadata,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    // Almacenar en IPFS si se solicita
    if (metadata.saveToIPFS) {
      try {
        const file = new File(
          [JSON.stringify(message)], 
          `qchat_${message.id}.json`,
          { type: 'application/json' }
        );
        
        const cid = await web3Storage.put([file], {
          name: `qchat_${message.id}`,
          wrapWithDirectory: false
        });
        
        message.metadata = {
          ...message.metadata,
          ipfsCid: cid.toString(),
          ipfsGatewayUrl: `https://${cid}.ipfs.dweb.link`
        };
      } catch (ipfsError) {
        console.error('Error al guardar en IPFS:', ipfsError);
        // Continuamos aunque falle IPFS
      }
    }
    
    // Almacenar mensaje (en memoria para este ejemplo)
    if (!messageStore.has(recipientDID)) {
      messageStore.set(recipientDID, []);
    }
    messageStore.get(recipientDID).push(message);
    
    res.status(201).json({
      success: true,
      messageId: message.id,
      ipfsCid: message.metadata?.ipfsCid
    });
    
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Obtener mensajes para un destinatario
 */
router.get('/messages/:recipientDID', validateDIDAuth, (req, res) => {
  try {
    const { recipientDID } = req.params;
    const { since, limit = 50 } = req.query;
    
    let messages = messageStore.get(recipientDID) || [];
    
    // Filtrar por fecha si se especifica
    if (since) {
      const sinceDate = new Date(since);
      messages = messages.filter(msg => new Date(msg.timestamp) > sinceDate);
    }
    
    // Limitar resultados
    messages = messages.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      messages
    });
    
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al recuperar mensajes' });
  }
});

/**
 * Endpoint de salud
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'qchat-backend'
  });
});

export default router;
