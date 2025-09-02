import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateRegistration, handleValidationErrors } from '../middleware/validation.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Simple test route
router.get('/test', (req, res) => {
  console.log('Auth test route hit!');
  res.json({ success: true, message: 'Auth test route works!' });
});

// Register route with rate limiting, validation middleware, and asyncHandler
router.post(
  '/register',
  authRateLimiter,
  validateRegistration,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    console.log('Register route with rate limiting, validation, and asyncHandler hit!');
    res.json({ 
      success: true, 
      message: 'Register route with rate limiting, validation, and asyncHandler works!',
      data: {
        alias: req.body?.alias || 'none',
        email: req.body?.email || 'none'
      }
    });
  })
);

export default router;
