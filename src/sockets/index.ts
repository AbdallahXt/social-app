import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Block } from '../models/Block';

const onlineUsers = new Map<string, Set<string>>();

function userRoom(userId: string) {
  return `user:${userId}`;
}

export function setupPresence(io: Server) {
  io.use((socket: Socket, next: (err?: any) => void) => {
    const token = (socket.handshake.auth?.token as string | undefined) || (socket.handshake.headers['authorization'] as string | undefined);
    if (token) {
      try {
        const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
        const payload: any = jwt.verify(raw, process.env.JWT_ACCESS_SECRET || '');
        socket.data.userId = payload.sub || payload.id;
      } catch {}
    }
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId: string | undefined = socket.data.userId;
    if (userId) {
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId)!.add(socket.id);
      socket.join(userRoom(userId));
      // compute block sets for this user to gate presence notifications
      const blocks = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] }).select('blocker blocked');
      const blockedOut = new Set<string>(blocks.filter((b) => String(b.blocker) === String(userId)).map((b) => String(b.blocked)));
      const blockedBy = new Set<string>(blocks.filter((b) => String(b.blocked) === String(userId)).map((b) => String(b.blocker)));
      // notify other online users except those blocked in either direction
      for (const otherId of onlineUsers.keys()) {
        if (otherId === userId) continue;
        if (blockedOut.has(otherId) || blockedBy.has(otherId)) continue;
        io.to(userRoom(otherId)).emit('user:online', { userId });
        // also tell this user about others that are visible
        // ensure we don't reveal blocked users to the connecting user
        const otherBlocks = await Block.countDocuments({
          $or: [
            { blocker: userId, blocked: otherId },
            { blocker: otherId, blocked: userId }
          ]
        });
        if (otherBlocks === 0) io.to(userRoom(userId)).emit('user:online', { userId: otherId });
      }
    }

    socket.on('typing:start', async (data: { toUserId: string }) => {
      if (!userId) return;
      const blocked = await Block.countDocuments({
        $or: [
          { blocker: userId, blocked: data.toUserId },
          { blocker: data.toUserId, blocked: userId }
        ]
      });
      if (blocked > 0) return;
      io.to(userRoom(data.toUserId)).emit('typing', { fromUserId: userId, toUserId: data.toUserId, typing: true });
    });

    socket.on('typing:stop', async (data: { toUserId: string }) => {
      if (!userId) return;
      const blocked = await Block.countDocuments({
        $or: [
          { blocker: userId, blocked: data.toUserId },
          { blocker: data.toUserId, blocked: userId }
        ]
      });
      if (blocked > 0) return;
      io.to(userRoom(data.toUserId)).emit('typing', { fromUserId: userId, toUserId: data.toUserId, typing: false });
    });

    socket.on('disconnect', async () => {
      if (!userId) return;
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          // notify only allowed users
          for (const otherId of onlineUsers.keys()) {
            if (otherId === userId) continue;
            const blocked = await Block.countDocuments({
              $or: [
                { blocker: userId, blocked: otherId },
                { blocker: otherId, blocked: userId }
              ]
            });
            if (blocked === 0) io.to(userRoom(otherId)).emit('user:offline', { userId });
          }
        }
      }
    });
  });
}

export function isUserOnline(userId: string) {
  return onlineUsers.has(userId);
}
