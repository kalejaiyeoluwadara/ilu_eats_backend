import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/main';

// Vercel serverless entrypoint. A function instance can be reused across many
// requests ("warm" invocations), so we build the Nest app once and cache the
// underlying Express handler at module scope. Every warm request then reuses the
// same app — and, crucially, the same open MongoDB connection — instead of
// cold-booting Nest and dialing Atlas again per request (the behaviour that was
// throwing MongoNetworkError and exhausting the connection pool).
type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedServer: ExpressHandler | undefined;
let initPromise: Promise<ExpressHandler> | undefined;

async function getServer(): Promise<ExpressHandler> {
  if (cachedServer) return cachedServer;
  // Guard against a burst of concurrent cold-start requests each building their
  // own app; they all await the same init.
  if (!initPromise) {
    initPromise = (async () => {
      const app = await createApp();
      await app.init(); // full DI/lifecycle wiring WITHOUT binding a port
      cachedServer = app.getHttpAdapter().getInstance() as ExpressHandler;
      return cachedServer;
    })();
  }
  return initPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getServer();
  server(req, res);
}
