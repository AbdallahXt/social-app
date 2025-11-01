import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodTypeAny } from 'zod';

export function validate(schema: { body?: ZodTypeAny; params?: ZodTypeAny; query?: ZodTypeAny }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) req.body = await schema.body.parseAsync(req.body);
      if (schema.params) req.params = await schema.params.parseAsync(req.params);
      if (schema.query) req.query = await schema.query.parseAsync(req.query);
      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errors: err.errors.map((e) => ({ path: e.path, message: e.message })) });
      }
      return next(err);
    }
  };
}
