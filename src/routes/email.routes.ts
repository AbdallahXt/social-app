import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendEmailController, sendEmailByTagController } from '../controllers/email.controller';
import { sendEmailSchema, sendEmailByTagSchema } from '../schemas/email.schema';

const router = Router();

router.post('/send', requireAuth, validate(sendEmailSchema), sendEmailController);
router.post('/send-by-tag', requireAuth, validate(sendEmailByTagSchema), sendEmailByTagController);

export default router;
