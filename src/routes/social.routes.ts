import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { blockUser, unblockUser, sendFriendRequest, acceptFriendRequest, declineFriendRequest, deleteFriendRequest, unFriend, listFriends, mutualFriends } from '../controllers/social.controller';
import { idParamSchema, friendRequestIdParamSchema } from '../schemas/social.schema';

const router = Router();

router.post('/block/:userId', requireAuth, validate(idParamSchema), blockUser);
router.delete('/block/:userId', requireAuth, validate(idParamSchema), unblockUser);

router.post('/friend-requests/:toUserId', requireAuth, validate(idParamSchema), sendFriendRequest);
router.post('/friend-requests/:id/accept', requireAuth, validate(friendRequestIdParamSchema), acceptFriendRequest);
router.post('/friend-requests/:id/decline', requireAuth, validate(friendRequestIdParamSchema), declineFriendRequest);
router.delete('/friend-requests/:id', requireAuth, validate(friendRequestIdParamSchema), deleteFriendRequest);

router.delete('/friends/:userId', requireAuth, validate(idParamSchema), unFriend);
router.get('/friends', requireAuth, listFriends);
router.get('/friends/mutual/:userId', requireAuth, validate(idParamSchema), mutualFriends);

export default router;
