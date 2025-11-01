import type { Express, Request } from 'express';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { typeDefs } from '../graphql/typeDefs';
import { resolvers } from '../graphql/resolvers';
import { env } from '../config/env';

export async function registerGraphQL(app: Express) {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: { req: Request }) => {
        const auth = (req.headers['authorization'] as string | undefined) || '';
        if (auth.startsWith('Bearer ')) {
          try {
            const token = auth.slice(7);
            const payload: any = jwt.verify(token, env.jwtAccessSecret);
            return { req, user: { id: payload.sub || payload.id, email: payload.email } };
          } catch {}
        }
        return { req };
      }
    })
  );
}
