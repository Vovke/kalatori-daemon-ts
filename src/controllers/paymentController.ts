import { Router } from 'express';
import { getPaymentStatus } from '../services/paymentService';

const router = Router();

router.post('/:paymentAccount', async (req, res, next) => {
  try {
    const { paymentAccount } = req.params;
    const status = await getPaymentStatus(paymentAccount);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
