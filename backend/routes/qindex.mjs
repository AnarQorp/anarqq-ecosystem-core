
import expressPkg from 'express';

// Router para la ruta /qindex
const router = expressPkg.Router();

router.get('/', (req, res) => {
  res.send('Ruta qindex funcionando');
});

export default router;
