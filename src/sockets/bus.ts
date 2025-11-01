import { Server } from 'socket.io';

let ioRef: Server | null = null;

export function registerIO(io: Server) {
  ioRef = io;
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (!ioRef) return;
  const room = `user:${userId}`;
  ioRef.to(room).emit(event, payload);
}
