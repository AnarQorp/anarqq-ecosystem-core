const http = require('http');
const url = require('url');

const PORT = 3006;

// Mock Qerberos service for development
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-priority');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'qerberos-mock' }));
    return;
  }

  // Audit endpoint
  if (path === '/api/v1/audit' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const auditEvent = JSON.parse(body);
        const priority = req.headers['x-priority'] || 'normal';
        
        // Mock audit processing
        console.log(`[${priority.toUpperCase()}] Audit event received:`, {
          eventId: auditEvent.eventId,
          eventType: auditEvent.eventType,
          severity: auditEvent.severity,
          actor: auditEvent.actor?.identity,
          resource: auditEvent.resource?.id,
          timestamp: auditEvent.timestamp,
        });

        // Simulate processing delay for high priority events
        const delay = priority === 'high' ? 100 : 50;
        
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'accepted',
            eventId: auditEvent.eventId,
            processed: true,
            priority,
            timestamp: new Date().toISOString(),
          }));
        }, delay);

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          error: 'Invalid audit event format',
          message: error.message 
        }));
      }
    });
    return;
  }

  // Risk score endpoint
  if (path === '/api/v1/risk-score' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { identity, activity, context } = data;

        // Mock risk scoring
        let riskScore = Math.random() * 100;
        
        // Adjust based on mock patterns
        if (identity && identity.includes('suspicious')) {
          riskScore = Math.max(riskScore, 70);
        }
        
        if (activity && activity.includes('rapid')) {
          riskScore = Math.max(riskScore, 60);
        }

        const riskLevel = riskScore > 80 ? 'HIGH' : 
                         riskScore > 50 ? 'MEDIUM' : 'LOW';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          identity,
          riskScore: Math.round(riskScore),
          riskLevel,
          factors: [
            'Historical behavior patterns',
            'Current activity analysis',
            'Network reputation',
          ],
          timestamp: new Date().toISOString(),
        }));

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          error: 'Invalid risk score request',
          message: error.message 
        }));
      }
    });
    return;
  }

  // Security alerts endpoint
  if (path === '/api/v1/alerts' && method === 'GET') {
    const alerts = [
      {
        id: 'alert-001',
        type: 'MULTIPLE_AUTH_FAILURES',
        severity: 'HIGH',
        description: 'Multiple authentication failures detected',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        resolved: false,
      },
      {
        id: 'alert-002',
        type: 'RAPID_REQUESTS',
        severity: 'MEDIUM',
        description: 'Rapid request pattern detected',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        resolved: true,
      },
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      alerts,
      total: alerts.length,
      unresolved: alerts.filter(a => !a.resolved).length,
    }));
    return;
  }

  // Anomaly detection endpoint
  if (path === '/api/v1/anomaly/detect' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Mock anomaly detection
        const isAnomaly = Math.random() > 0.8; // 20% chance of anomaly
        const confidence = Math.random() * 100;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          anomaly: isAnomaly,
          confidence: Math.round(confidence),
          patterns: isAnomaly ? [
            'Unusual request timing',
            'Atypical resource access pattern',
          ] : [],
          recommendation: isAnomaly ? 'Monitor closely' : 'Normal behavior',
          timestamp: new Date().toISOString(),
        }));

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          error: 'Invalid anomaly detection request',
          message: error.message 
        }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Qerberos mock service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Qerberos mock service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Qerberos mock service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});