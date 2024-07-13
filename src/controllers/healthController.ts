import { Router } from 'express';
import { getHealth } from '../services/statusService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const health = await getHealth();
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
});

export default router;
