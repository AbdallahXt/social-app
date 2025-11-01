import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { logAudit } from '../services/audit';
import { cascadeDeleteComment } from '../services/cascade';
import { isBlockedBetween } from '../services/block';

export async function createComment(req: Request, res: Response) {
  const { postId, parentComment, content } = req.body as { postId: string; parentComment?: string; content: string };
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.isFrozen) return res.status(403).json({ error: 'Post is frozen' });
  // blocked from post author
  const authorId = ((post as any).author?._id?.toString?.() || (post as any).author?.toString?.() || '').toString();
  if (authorId) {
    const blocked = await isBlockedBetween(req.user!.id, authorId);
    if (blocked) return res.status(403).json({ error: 'Blocked' });
  }
  const comment = await Comment.create({ post: post._id, author: req.user!.id, parentComment, content });
  return res.status(201).json({ comment });
}

export async function updateComment(req: Request, res: Response) {
  const { id } = req.params;
  const comment = await Comment.findById(id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (comment.isFrozen) return res.status(403).json({ error: 'Comment is frozen' });
  comment.content = req.body.content ?? comment.content;
  await comment.save();
  return res.json({ comment });
}

export async function freezeComment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body || {};
  const found = await Comment.findById(id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  if (found.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const comment = await Comment.findByIdAndUpdate(id, { isFrozen: true, frozenBy: req.user!.id, frozenReason: reason, frozenAt: new Date() }, { new: true });
  await logAudit({ actor: req.user!.id, action: 'freeze', targetType: 'comment', targetId: String((comment as any)!._id), reason });
  return res.json({ comment });
}

export async function unfreezeComment(req: Request, res: Response) {
  const { id } = req.params;
  const found = await Comment.findById(id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  if (found.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const comment = await Comment.findByIdAndUpdate(id, { isFrozen: false, frozenBy: undefined, frozenReason: undefined, frozenAt: undefined }, { new: true });
  await logAudit({ actor: req.user!.id, action: 'unfreeze', targetType: 'comment', targetId: String((comment as any)!._id) });
  return res.json({ comment });
}

export async function hardDeleteComment(req: Request, res: Response) {
  const { id } = req.params;
  const comment = await Comment.findById(id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.author.toString() !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const cid = String((comment as any)._id);
  await cascadeDeleteComment(cid as any);
  await logAudit({ actor: req.user!.id, action: 'hard_delete', targetType: 'comment', targetId: cid, reason: req.body?.reason });
  return res.json({ status: 'deleted' });
}

export async function getCommentById(req: Request, res: Response) {
  const { id } = req.params;
  const comment = await Comment.findById(id).populate('author', 'name avatar');
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.isFrozen && (!req.user || String(comment.author) !== String(req.user.id))) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.user) {
    const authorId = ((comment as any).author?._id?.toString?.() || (comment as any).author?.toString?.() || '').toString();
    if (authorId) {
      const blocked = await isBlockedBetween(req.user.id, authorId);
      if (blocked) return res.status(404).json({ error: 'Not found' });
    }
  }
  return res.json({ comment });
}

function buildTree(items: any[], parentId?: string): any[] {
  return items
    .filter((i) => String(i.parentComment || '') === String(parentId || ''))
    .map((i) => ({ ...i, replies: buildTree(items, String(i._id)) }));
}

export async function getCommentWithReply(req: Request, res: Response) {
  const { id } = req.params;
  const cid = new Types.ObjectId(id);
  const result = await Comment.aggregate([
    { $match: { _id: cid } },
    {
      $graphLookup: {
        from: 'comments',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentComment',
        as: 'replies'
      }
    },
    { $project: { root: '$$ROOT', replies: 1 } }
  ]);
  if (!result.length) return res.status(404).json({ error: 'Not found' });
  const root = result[0].root as any;
  // frozen gating for root
  if (root.isFrozen && (!req.user || String(root.author) !== String(req.user.id))) {
    return res.status(404).json({ error: 'Not found' });
  }
  // block gating vs root author
  if (req.user) {
    const rootAuthorId = (root.author?._id?.toString?.() || root.author?.toString?.() || '').toString();
    if (rootAuthorId) {
      const blocked = await isBlockedBetween(req.user.id, rootAuthorId);
      if (blocked) return res.status(404).json({ error: 'Not found' });
    }
  }
  const flat = [root, ...(result[0].replies as any[])].map((d: any) => ({ _id: d._id, post: d.post, author: d.author, parentComment: d.parentComment, content: d.content, createdAt: d.createdAt }));
  const tree = buildTree(flat, undefined)[0];
  return res.json({ comment: tree });
}
