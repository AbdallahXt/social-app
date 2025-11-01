import { Block } from '../models/Block';

export async function isBlockedBetween(aUserId: string, bUserId: string) {
  const blocked = await Block.countDocuments({
    $or: [
      { blocker: aUserId, blocked: bUserId },
      { blocker: bUserId, blocked: aUserId }
    ]
  });
  return blocked > 0;
}
