import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeCache } from './services/cache.js';
import { initializeNotion } from './services/notion.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import itemsRouter from './routes/items.js';
import cacheRouter from './routes/cache.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Apply rate limiting to API routes
app.use('/api', apiRateLimiter);

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Initialize services
console.info('[Server] Initializing services...');
initializeCache(config.cache.ttlSeconds);
initializeNotion(config.notion);
console.info('[Server] Services initialized');
console.info(
  `[Server] Configured databases: ${config.notion.databases.map(d => d.type).join(', ')}`
);

// Routes
app.use('/api/items', itemsRouter);
app.use('/api/cache', cacheRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databases: config.notion.databases.length,
    cacheConfig: {
      ttlSeconds: config.cache.ttlSeconds,
    },
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);

  // Check if response already sent to avoid "headers already sent" error
  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server with error handling
const server = app.listen(config.port, () => {
  console.info(`[Server] Running on http://localhost:${config.port}`);
  console.info(`[Server] CORS origin: ${config.corsOrigin}`);
  console.info(`[Server] Cache TTL: ${config.cache.ttlSeconds}s`);
});

// Handle server startup errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${config.port} is already in use`);
  } else if (error.code === 'EACCES') {
    console.error(`[Server] Port ${config.port} requires elevated privileges`);
  } else {
    console.error('[Server] Failed to start:', error.message);
  }
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  console.info(`[Server] ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.info('[Server] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
