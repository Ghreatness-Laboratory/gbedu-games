import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { apiRouter } from './apps/server/src/api';
import { setupSocketIO } from './apps/server/src/socket';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  process.loadEnvFile();
} catch {
  // .env may not exist in some environments
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  // Mount API routes
  app.use('/api', apiRouter);

  // Setup Socket.IO on the unified HTTP server
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  setupSocketIO(io);

  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    // Mount Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Gbedu Games] Server & Socket.IO running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Gbedu Games] Failed to start server:', err);
  process.exit(1);
});
