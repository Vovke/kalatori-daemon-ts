import { Router, Request, Response, NextFunction } from 'express';
import { createOrUpdateOrder, withdrawOrder, getOrder } from '../services/orderService';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { NotFoundError } from '../errors/notFoundError';

const router = Router();

router.post('/:orderId', validationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await createOrUpdateOrder(orderId, req.body);
    res.status(order.existing ? 200 : 201).json(order);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      next(error);
    } else {
      next(new Error('Unknown error'));
    }
  }
});

router.post('/:orderId/forceWithdrawal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await withdrawOrder(orderId);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      next(error);
    } else {
      next(new Error('Unknown error'));
    }
  }
});

router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await getOrder(orderId);
    res.status(200).json(order);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      next(error);
    } else {
      next(new Error('Unknown error'));
    }
  }
});

export default router;
