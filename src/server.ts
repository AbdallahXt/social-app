import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './startup/db';
import { setupPresence } from './sockets';
import { app } from './app';
import { registerIO } from './sockets/bus';
import { registerGraphQL } from './startup/graphql';

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*', credentials: true } });
registerIO(io);
setupPresence(io);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

connectDB().then(async () => {
  await registerGraphQL(app);
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});

export { app, io, server };
