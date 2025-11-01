import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { isBlockedBetween } from '../services/block';
import { env } from '../config/env';

export interface GQLContext {
  req: any;
  user?: { id: string; email: string } | null;
}

export const resolvers = {
  Query: {
    async me(_parent: any, _args: any, ctx: GQLContext) {
      if (!ctx.user) return null;
      const u = await User.findById(ctx.user.id).select('email name avatar bio');
      if (!u) return null;
      return { id: String(u._id), email: u.email, name: (u as any).name, avatar: (u as any).avatar, bio: (u as any).bio };
    },
    async user(_parent: any, { id }: any, _ctx: GQLContext) {
      const u = await User.findById(id).select('email name avatar bio');
      if (!u) return null;
      return { id: String(u._id), email: u.email, name: (u as any).name, avatar: (u as any).avatar, bio: (u as any).bio };
    },
    async post(_parent: any, { id }: any, ctx: GQLContext) {
      const p = await Post.findById(id);
      if (!p) return null;
      const viewerId = ctx.user?.id;
      // hide frozen for non-author
      if (p.isFrozen && (!viewerId || String(p.author) !== String(viewerId))) return null;
      if (viewerId) {
        const blocked = await isBlockedBetween(viewerId, String(p.author));
        if (blocked) return null;
      }
      return { id: String((p as any)._id), author: String(p.author), content: p.content, isFrozen: !!p.isFrozen, createdAt: p.createdAt.toISOString() };
    },
    async comment(_parent: any, { id }: any, ctx: GQLContext) {
      const c = await Comment.findById(id);
      if (!c) return null;
      const viewerId = ctx.user?.id;
      if (c.isFrozen && (!viewerId || String(c.author) !== String(viewerId))) return null;
      if (viewerId) {
        const blocked = await isBlockedBetween(viewerId, String(c.author));
        if (blocked) return null;
      }
      return { id: String((c as any)._id), author: String(c.author), post: String(c.post), content: c.content, parentComment: c.parentComment ? String(c.parentComment) : null, createdAt: c.createdAt.toISOString() };
    }
  },
  Mutation: {
    async createPost(_p: any, { content }: any, ctx: GQLContext) {
      if (!ctx.user) throw new Error('Unauthorized');
      const p = await Post.create({ author: ctx.user.id, content });
      return { id: String((p as any)._id), author: String(p.author), content: p.content, isFrozen: !!p.isFrozen, createdAt: p.createdAt.toISOString() };
    },
    async updatePost(_p: any, { id, content }: any, ctx: GQLContext) {
      if (!ctx.user) throw new Error('Unauthorized');
      const p = await Post.findById(id);
      if (!p) throw new Error('Not found');
      if (String(p.author) !== ctx.user.id) throw new Error('Forbidden');
      if (p.isFrozen) throw new Error('Post is frozen');
      p.content = content;
      await p.save();
      return { id: String((p as any)._id), author: String(p.author), content: p.content, isFrozen: !!p.isFrozen, createdAt: p.createdAt.toISOString() };
    },
    async createComment(_p: any, { postId, parentComment, content }: any, ctx: GQLContext) {
      if (!ctx.user) throw new Error('Unauthorized');
      const post = await Post.findById(postId);
      if (!post) throw new Error('Not found');
      if (post.isFrozen) throw new Error('Post is frozen');
      const blocked = await isBlockedBetween(ctx.user.id, String(post.author));
      if (blocked) throw new Error('Blocked');
      const c = await Comment.create({ post: post._id, author: ctx.user.id, parentComment, content });
      return { id: String((c as any)._id), author: String(c.author), post: String(c.post), content: c.content, parentComment: c.parentComment ? String(c.parentComment) : null, createdAt: c.createdAt.toISOString() };
    },
    async updateComment(_p: any, { id, content }: any, ctx: GQLContext) {
      if (!ctx.user) throw new Error('Unauthorized');
      const c = await Comment.findById(id);
      if (!c) throw new Error('Not found');
      if (String(c.author) !== ctx.user.id) throw new Error('Forbidden');
      if (c.isFrozen) throw new Error('Comment is frozen');
      c.content = content;
      await c.save();
      return { id: String((c as any)._id), author: String(c.author), post: String(c.post), content: c.content, parentComment: c.parentComment ? String(c.parentComment) : null, createdAt: c.createdAt.toISOString() };
    }
  },
  Post: {
    async author(parent: any) {
      const u = await User.findById(parent.author).select('email name avatar bio');
      if (!u) return null;
      return { id: String(u._id), email: u.email, name: (u as any).name, avatar: (u as any).avatar, bio: (u as any).bio };
    }
  },
  Comment: {
    async author(parent: any) {
      const u = await User.findById(parent.author).select('email name avatar bio');
      if (!u) return null;
      return { id: String(u._id), email: u.email, name: (u as any).name, avatar: (u as any).avatar, bio: (u as any).bio };
    },
    async post(parent: any) {
      const p = await Post.findById(parent.post);
      if (!p) return null;
      return { id: String((p as any)._id), author: String(p.author), content: p.content, isFrozen: !!p.isFrozen, createdAt: p.createdAt.toISOString() };
    },
    async replies(parent: any, _args: any, ctx: GQLContext) {
      const viewerId = ctx.user?.id;
      const children = await Comment.find({ parentComment: parent.id });
      const filtered = [] as any[];
      for (const c of children) {
        if (c.isFrozen && (!viewerId || String(c.author) !== String(viewerId))) continue;
        if (viewerId) {
          const blocked = await isBlockedBetween(viewerId, String(c.author));
          if (blocked) continue;
        }
        filtered.push({ id: String((c as any)._id), author: String(c.author), post: String(c.post), content: c.content, parentComment: c.parentComment ? String(c.parentComment) : null, createdAt: c.createdAt.toISOString() });
      }
      return filtered;
    }
  }
};
