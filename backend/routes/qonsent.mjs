
import expressPkg from 'express';

// Router para la ruta /qonsent
const router = expressPkg.Router();

router.get('/', (req, res) => {
  res.send('Ruta qonsent funcionando');
});

export default router;
