#!/usr/bin/env node

/**
 * Health Check Script for Docker
 * 
 * Simple health check script that can be used by Docker HEALTHCHECK.
 */

import http from 'http';

const PORT = process.env.PORT || 3008;
const TIMEOUT = 5000;

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/health',
  method: 'GET',
  timeout: TIMEOUT
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();