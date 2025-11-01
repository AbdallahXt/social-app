import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { logAudit } from '../services/audit';
import { cascadeDeletePost } from '../services/cascade';
import { isBlockedBetween } from '../services/block';

export async function createPost(req: Request, res: Response) {
  const { content, media } = req.body;
  const post = await Post.create({ author: req.user!.id, content, media });
  return res.status(201).json({ post });
}

export async function updatePost(req: Request, res: Response) {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (post.isFrozen) return res.status(403).json({ error: 'Post is frozen' });
  post.content = req.body.content ?? post.content;
  post.media = req.body.media ?? post.media;
  await post.save();
  return res.json({ post });
}

export async function freezePost(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body || {};
  const found = await Post.findById(id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  if (found.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const post = await Post.findByIdAndUpdate(id, { isFrozen: true, frozenBy: req.user!.id, frozenReason: reason, frozenAt: new Date() }, { new: true });
  await logAudit({ actor: req.user!.id, action: 'freeze', targetType: 'post', targetId: String((post as any)._id), reason });
  return res.json({ post });
}

export async function unfreezePost(req: Request, res: Response) {
  const { id } = req.params;
  const found = await Post.findById(id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  if (found.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const post = await Post.findByIdAndUpdate(id, { isFrozen: false, frozenBy: undefined, frozenReason: undefined, frozenAt: undefined }, { new: true });
  await logAudit({ actor: req.user!.id, action: 'unfreeze', targetType: 'post', targetId: String((post as any)._id) });
  return res.json({ post });
}

export async function hardDeletePost(req: Request, res: Response) {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const pid = String((post as any)._id);
  await Post.deleteOne({ _id: pid } as any);
  await cascadeDeletePost(pid);
  await logAudit({ actor: req.user!.id, action: 'hard_delete', targetType: 'post', targetId: pid, reason: req.body?.reason });
  return res.json({ status: 'deleted' });
}

export async function getPostById(req: Request, res: Response) {
  const { id } = req.params;
  const post = await Post.findById(id).populate('author', 'name avatar');
  if (!post) return res.status(404).json({ error: 'Not found' });
  // hide frozen posts from non-authors
  if (post.isFrozen && (!req.user || String(post.author) !== String(req.user.id))) {
    return res.status(404).json({ error: 'Not found' });
  }
  // block gating: if viewer is blocked by author or vice versa, hide content
  if (req.user) {
    const authorId = ((post as any).author?._id?.toString?.() || (post as any).author?.toString?.() || '').toString();
    if (authorId) {
      const blocked = await isBlockedBetween(req.user.id, authorId);
      if (blocked) return res.status(404).json({ error: 'Not found' });
    }
  }
  return res.json({ post });
}
