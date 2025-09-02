
import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Middleware to authenticate sQuid identity
export const authenticateSquid = (req, res, next) => {
  try {
    // Check for sQuid ID in headers or body
    const squidId = req.headers['x-squid-id'] || req.body.squidId;
    
    if (!squidId) {
      return res.status(401).json({ 
        success: false,
        error: 'sQuid ID required for authentication' 
      });
    }

    // For now, we'll use a simple validation
    // In production, this would verify the sQuid identity signature
    if (squidId.length < 3) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid sQuid ID format' 
      });
    }

    // Add squidId to request object
    req.squidId = squidId;
    next();

  } catch (error) {
    console.error('sQuid authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};
