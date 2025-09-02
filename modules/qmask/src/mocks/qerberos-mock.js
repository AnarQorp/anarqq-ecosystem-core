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

  if (req.url === '/api/v1/audit/log' && req.method === 'POST') {
    // Mock audit logging - accept all logs in standalone mode
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.url === '/api/v1/risk/score' && req.method === 'POST') {
    // Mock risk scoring
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      riskScore: Math.random() * 0.3, // Low risk for mock
      riskLevel: 'LOW',
      factors: ['mock-assessment']
    }));
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'qerberos-mock',
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

server.listen(3006, () => {
  console.log('Mock Qerberos service running on port 3006');
});