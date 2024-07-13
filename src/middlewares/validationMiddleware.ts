import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const schema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required'
  }),
  currency: Joi.string().required().messages({
    'string.base': 'Currency must be a string',
    'any.required': 'Currency is required'
  }),
  callback: Joi.string().uri().optional().messages({
    'string.uri': 'Callback must be a valid URI'
  })
});

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const details = error.details.map(detail => ({
      parameter: detail.context?.key,
      message: detail.message
    }));
    return res.status(400).json(details);
  }

  next();
};
