const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/v1/identity/verify' && req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401);
      res.end(JSON.stringify({
        status: 'error',
        code: 'SQUID_AUTH_REQUIRED',
        message: 'Authorization header required'
      }));
      return;
    }

    const token = authHeader.substring(7);
    const parts = token.split(':');
    
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      squidId: parts[1] || 'mock-identity',
      subId: parts[2],
      valid: true
    }));
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'squid-mock',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint not found'
  }));
});

server.listen(3001, () => {
  console.log('Mock sQuid service running on port 3001');
});