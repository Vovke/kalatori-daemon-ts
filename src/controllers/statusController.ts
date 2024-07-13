import { Router } from 'express';
import { getStatus } from '../services/statusService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const status = await getStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
