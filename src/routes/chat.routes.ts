import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendMessage, getMessages } from '../controllers/chat.controller';
import { sendMessageSchema, getMessagesSchema } from '../schemas/chat.schema';

const router = Router();

router.post('/messages', requireAuth, validate(sendMessageSchema), sendMessage);
router.get('/messages/:userId', requireAuth, validate(getMessagesSchema), getMessages);

export default router;
