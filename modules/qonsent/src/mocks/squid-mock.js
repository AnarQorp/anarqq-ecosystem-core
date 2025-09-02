const http = require('http');
const url = require('url');

const PORT = 3001;

// Mock sQuid service for development
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-squid-id, x-sig, x-ts');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'squid-mock' }));
    return;
  }

  // Verify token endpoint
  if (path === '/api/v1/auth/verify' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, error: 'Missing or invalid token' }));
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Mock token validation
      if (token === 'invalid-token') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, error: 'Invalid token' }));
        return;
      }

      // Return mock successful verification
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        valid: true,
        identity: {
          squidId: 'did:squid:test-user',
          subId: 'did:squid:test-user:work',
          daoId: 'dao:test-dao',
        },
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      }));
    });
    return;
  }

  // Verify signature endpoint
  if (path === '/api/v1/auth/verify-signature' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { squidId, signature, timestamp, payload } = data;

        // Mock signature validation
        if (signature === 'invalid-signature') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ valid: false }));
          return;
        }

        // Check timestamp (should be within 5 minutes)
        const now = Date.now();
        const requestTime = new Date(timestamp).getTime();
        if (Math.abs(now - requestTime) > 300000) { // 5 minutes
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ valid: false, error: 'Timestamp too old' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: true }));

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, error: 'Invalid request body' }));
      }
    });
    return;
  }

  // Verify identity endpoint
  if (path.startsWith('/api/v1/identity/') && method === 'GET') {
    const squidId = path.split('/').pop();
    
    // Mock identity verification
    if (squidId && !squidId.includes('invalid')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        squidId,
        exists: true,
        reputation: Math.random(),
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Identity not found' }));
    }
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`sQuid mock service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('sQuid mock service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('sQuid mock service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});