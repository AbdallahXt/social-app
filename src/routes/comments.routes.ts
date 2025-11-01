import { Router } from 'express';
import { requireAuth, maybeAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createComment, updateComment, freezeComment, unfreezeComment, hardDeleteComment, getCommentById, getCommentWithReply } from '../controllers/comments.controller';
import { createCommentSchema, updateCommentSchema, idParamSchema, freezeSchema } from '../schemas/comment.schema';

const router = Router();

router.post('/', requireAuth, validate(createCommentSchema), createComment);
router.get('/:id', maybeAuth, validate(idParamSchema), getCommentById);
router.get('/:id/with-replies', maybeAuth, validate(idParamSchema), getCommentWithReply);
router.patch('/:id', requireAuth, validate(updateCommentSchema), updateComment);
router.post('/:id/freeze', requireAuth, validate(freezeSchema), freezeComment);
router.delete('/:id/hard', requireAuth, validate(idParamSchema), hardDeleteComment);

export default router;
