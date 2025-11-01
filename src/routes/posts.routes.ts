import { Router } from 'express';
import { requireAuth, maybeAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPost, updatePost, freezePost, hardDeletePost, getPostById } from '../controllers/posts.controller';
import { createPostSchema, updatePostSchema, freezeSchema, idParamSchema } from '../schemas/post.schema';

const router = Router();

router.post('/', requireAuth, validate(createPostSchema), createPost);
router.get('/:id', maybeAuth, validate(idParamSchema), getPostById);
router.patch('/:id', requireAuth, validate(updatePostSchema), updatePost);
router.post('/:id/freeze', requireAuth, validate(freezeSchema), freezePost);
router.delete('/:id/hard', requireAuth, validate(idParamSchema), hardDeletePost);

export default router;
