import axios from 'axios';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001/api/auth';

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers,
      validateStatus: () => true, // Don't throw on HTTP error status codes
    });

    return {
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error('Request failed:', error.message);
    return {
      status: 500,
      data: { error: 'Request failed', details: error.message },
    };
  }
}

// Test registration
async function testRegistration() {
  console.log('\n=== Testing Registration ===');
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testAlias = `testuser_${Date.now().toString(36).substring(2, 10)}`;
  
  // Test valid registration
  console.log('Testing valid registration...');
  const validReg = await makeRequest('POST', '/register', {
    email: testEmail,
    alias: testAlias,
    password: 'Test123!',
  });
  
  console.log('Status:', validReg.status);
  console.log('Response:', JSON.stringify(validReg.data, null, 2));
  
  // Test duplicate email
  console.log('\nTesting duplicate email...');
  const dupEmail = await makeRequest('POST', '/register', {
    email: testEmail,
    alias: 'another_alias',
    password: 'Test123!',
  });
  
  console.log('Status:', dupEmail.status);
  console.log('Response:', JSON.stringify(dupEmail.data, null, 2));
  
  // Test invalid email
  console.log('\nTesting invalid email...');
  const invalidEmail = await makeRequest('POST', '/register', {
    email: 'not-an-email',
    alias: 'testuser',
    password: 'Test123!',
  });
  
  console.log('Status:', invalidEmail.status);
  console.log('Response:', JSON.stringify(invalidEmail.data, null, 2));
  
  return { email: testEmail, alias: testAlias };
}

// Test login
async function testLogin(credentials) {
  console.log('\n=== Testing Login ===');
  
  // Test valid login
  console.log('Testing valid login...');
  const validLogin = await makeRequest('POST', '/login', {
    alias: credentials.alias,
    password: 'Test123!',
  });
  
  console.log('Status:', validLogin.status);
  console.log('Response:', JSON.stringify(validLogin.data, null, 2));
  
  // Test invalid password
  console.log('\nTesting invalid password...');
  const invalidPass = await makeRequest('POST', '/login', {
    alias: credentials.alias,
    password: 'wrongpassword',
  });
  
  console.log('Status:', invalidPass.status);
  console.log('Response:', JSON.stringify(invalidPass.data, null, 2));
  
  return validLogin.data.token;
}

// Test protected route
async function testProtectedRoute(token) {
  console.log('\n=== Testing Protected Route ===');
  
  // Test with valid token
  console.log('Testing with valid token...');
  const validToken = await makeRequest('GET', '/me', null, token);
  
  console.log('Status:', validToken.status);
  console.log('Response:', JSON.stringify(validToken.data, null, 2));
  
  // Test with invalid token
  console.log('\nTesting with invalid token...');
  const invalidToken = await makeRequest('GET', '/me', null, 'invalid.token.here');
  
  console.log('Status:', invalidToken.status);
  console.log('Response:', JSON.stringify(invalidToken.data, null, 2));
}

// Test rate limiting
async function testRateLimiting() {
  console.log('\n=== Testing Rate Limiting ===');
  
  // Make multiple requests to trigger rate limiting
  console.log('Making multiple requests to trigger rate limiting...');
  const requests = [];
  
  for (let i = 0; i < 105; i++) {
    requests.push(
      makeRequest('POST', '/login', {
        alias: 'testuser',
        password: 'wrongpassword',
      })
    );
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.filter(res => res.status === 429);
  
  console.log(`Made ${results.length} requests`);
  console.log(`Rate limited requests: ${rateLimited.length}`);
  
  if (rateLimited.length > 0) {
    console.log('Rate limiting is working!');
  } else {
    console.log('Rate limiting may not be working as expected');
  }
}

// Run all tests
async function runTests() {
  try {
    // Test registration
    const credentials = await testRegistration();
    
    // Test login
    const token = await testLogin(credentials);
    
    if (token) {
      // Test protected route
      await testProtectedRoute(token);
    }
    
    // Uncomment to test rate limiting (warning: will make many requests)
    // await testRateLimiting();
    
    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Start the tests
runTests();
