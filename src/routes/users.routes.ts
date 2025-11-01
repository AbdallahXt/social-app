import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { me, updateProfile } from '../controllers/users.controller';
import { updateProfileSchema } from '../schemas/user.schema';

const router = Router();

router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
