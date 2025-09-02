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

  if (req.url === '/api/v1/permissions/check' && req.method === 'POST') {
    // Mock permission check - always allow in standalone mode
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      allowed: true,
      reason: 'Mock permission granted',
      policy: {
        name: 'mock-policy',
        version: '1.0.0'
      }
    }));
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'qonsent-mock',
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

server.listen(3003, () => {
  console.log('Mock Qonsent service running on port 3003');
});