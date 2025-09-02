import { Router } from 'express';

const router = Router();

// Minimal test route without any middleware
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'Test route works!' });
});

export default router;
