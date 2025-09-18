import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3020;

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory storage for demo
const users = new Map();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check alias availability
app.post('/api/auth/check-alias', (req, res) => {
  try {
    const { alias } = req.body;
    
    if (!alias) {
      return res.status(400).json({
        status: 'error',
        message: 'Alias is required'
      });
    }

    const exists = users.has(alias);
    
    res.json({
      status: 'success',
      available: !exists,
      alias
    });
  } catch (error) {
    console.error('Check alias error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Register user
app.post('/api/auth/register', (req, res) => {
  try {
    const { alias, password, email } = req.body;
    
    if (!alias || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Alias and password are required'
      });
    }

    if (users.has(alias)) {
      return res.status(409).json({
        status: 'error',
        message: 'Alias already exists'
      });
    }

    // Store user (in production, hash the password!)
    users.set(alias, {
      alias,
      password, // In production: hash this!
      email,
      createdAt: new Date().toISOString(),
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.log(`[Auth] User registered: ${alias}`);

    res.json({
      status: 'success',
      message: 'User registered successfully',
      user: {
        alias,
        email,
        id: users.get(alias).id
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed'
    });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { alias, password } = req.body;
    
    if (!alias || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Alias and password are required'
      });
    }

    const user = users.get(alias);
    
    if (!user || user.password !== password) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    console.log(`[Auth] User logged in: ${alias}`);

    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        alias: user.alias,
        email: user.email,
        id: user.id
      },
      token: `token_${user.id}_${Date.now()}` // Simple token for demo
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});