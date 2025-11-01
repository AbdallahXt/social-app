import { Request, Response } from 'express';
import { ChatMessage } from '../models/ChatMessage';
import { isBlockedBetween } from '../services/block';
import { emitToUser } from '../sockets/bus';

export async function sendMessage(req: Request, res: Response) {
  const { to, content } = req.body as { to: string; content: string };
  if (await isBlockedBetween(req.user!.id, to)) return res.status(403).json({ error: 'Blocked' });
  const msg = await ChatMessage.create({ from: req.user!.id, to, content });
  emitToUser(to, 'chat:message', { message: { id: String((msg as any)._id), from: String((msg as any).from), to: String((msg as any).to), content: msg.content, createdAt: msg.createdAt } });
  return res.status(201).json({ message: msg });
}

export async function getMessages(req: Request, res: Response) {
  const { userId } = req.params as { userId: string };
  if (await isBlockedBetween(req.user!.id, userId)) return res.status(403).json({ error: 'Blocked' });
  const limitNum = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 100);
  const before = req.query.before as string | undefined;
  const filter: any = {
    $or: [
      { from: req.user!.id, to: userId },
      { from: userId, to: req.user!.id }
    ]
  };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const items = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limitNum);
  return res.json({ messages: items.reverse() });
}
