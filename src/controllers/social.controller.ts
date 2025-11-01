import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Block } from '../models/Block';
import { FriendRequest } from '../models/FriendRequest';
import { Friendship } from '../models/Friendship';

export async function blockUser(req: Request, res: Response) {
  const toBlock = req.params.userId;
  if (toBlock === req.user!.id) return res.status(400).json({ error: 'Cannot block self' });
  const doc = await Block.findOneAndUpdate({ blocker: req.user!.id, blocked: toBlock }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
  return res.json({ block: doc });
}

export async function unblockUser(req: Request, res: Response) {
  const toUnblock = req.params.userId;
  await Block.deleteOne({ blocker: req.user!.id, blocked: toUnblock });
  return res.json({ status: 'ok' });
}

export async function sendFriendRequest(req: Request, res: Response) {
  const to = req.params.toUserId;
  if (to === req.user!.id) return res.status(400).json({ error: 'Cannot friend self' });
  const blocked = await Block.countDocuments({
    $or: [
      { blocker: req.user!.id, blocked: to },
      { blocker: to, blocked: req.user!.id }
    ]
  });
  if (blocked > 0) return res.status(403).json({ error: 'Blocked' });
  const fr = await FriendRequest.create({ from: req.user!.id, to, status: 'pending' });
  return res.status(201).json({ request: fr });
}

export async function acceptFriendRequest(req: Request, res: Response) {
  const { id } = req.params;
  const fr = await FriendRequest.findById(id);
  if (!fr || fr.to.toString() !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  fr.status = 'accepted';
  await fr.save();
  const pair = [new Types.ObjectId(fr.from), new Types.ObjectId(fr.to)].sort((a, b) => a.toString().localeCompare(b.toString()));
  await Friendship.updateOne({ user1: pair[0], user2: pair[1] }, {}, { upsert: true });
  return res.json({ request: fr });
}

export async function declineFriendRequest(req: Request, res: Response) {
  const { id } = req.params;
  const fr = await FriendRequest.findById(id);
  if (!fr || fr.to.toString() !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  fr.status = 'declined';
  await fr.save();
  return res.json({ request: fr });
}

export async function deleteFriendRequest(req: Request, res: Response) {
  const { id } = req.params;
  const fr = await FriendRequest.findById(id);
  if (!fr || (fr.from.toString() !== req.user!.id && fr.to.toString() !== req.user!.id)) return res.status(404).json({ error: 'Not found' });
  await FriendRequest.deleteOne({ _id: fr._id });
  return res.json({ status: 'deleted' });
}

export async function unFriend(req: Request, res: Response) {
  const userId = new Types.ObjectId(req.user!.id);
  const other = new Types.ObjectId(req.params.userId);
  const pair = [userId, other].sort((a, b) => a.toString().localeCompare(b.toString()));
  await Friendship.deleteOne({ user1: pair[0], user2: pair[1] });
  return res.json({ status: 'deleted' });
}

export async function listFriends(req: Request, res: Response) {
  const me = new Types.ObjectId(req.user!.id);
  const rows = await Friendship.find({ $or: [{ user1: me }, { user2: me }] });
  const ids = rows.map((r) => String(r.user1) === String(me) ? String(r.user2) : String(r.user1));
  return res.json({ friends: ids });
}

export async function mutualFriends(req: Request, res: Response) {
  const me = new Types.ObjectId(req.user!.id);
  const other = new Types.ObjectId(req.params.userId);
  const myRows = await Friendship.find({ $or: [{ user1: me }, { user2: me }] });
  const otherRows = await Friendship.find({ $or: [{ user1: other }, { user2: other }] });
  const mySet = new Set(myRows.map((r) => String(r.user1) === String(me) ? String(r.user2) : String(r.user1)));
  const otherSet = new Set(otherRows.map((r) => String(r.user1) === String(other) ? String(r.user2) : String(r.user1)));
  const mutual: string[] = [];
  for (const id of mySet) if (otherSet.has(id)) mutual.push(id);
  return res.json({ mutual });
}
