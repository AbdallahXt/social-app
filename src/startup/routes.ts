import { Express } from 'express';
import authRoutes from '../routes/auth.routes';
import userRoutes from '../routes/users.routes';
import postRoutes from '../routes/posts.routes';
import commentRoutes from '../routes/comments.routes';
import socialRoutes from '../routes/social.routes';
import emailRoutes from '../routes/email.routes';
import chatRoutes from '../routes/chat.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/chat', chatRoutes);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
}
