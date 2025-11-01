import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { registerRoutes } from './startup/routes';
import { errorHandler } from './middleware/error';

dotenv.config();

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  registerRoutes(app);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
