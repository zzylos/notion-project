import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeCache } from './services/cache.js';
import { initializeNotion } from './services/notion.js';
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

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Initialize services
console.info('[Server] Initializing services...');
initializeCache(config.cache.ttlSeconds, config.cache.checkPeriodSeconds);
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
      checkPeriodSeconds: config.cache.checkPeriodSeconds,
    },
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(config.port, () => {
  console.info(`[Server] Running on http://localhost:${config.port}`);
  console.info(`[Server] CORS origin: ${config.corsOrigin}`);
  console.info(`[Server] Cache TTL: ${config.cache.ttlSeconds}s`);
});
