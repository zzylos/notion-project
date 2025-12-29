import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeDataStore, getDataStore } from './services/dataStore.js';
import { initializeNotion, getNotion } from './services/notion.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import itemsRouter from './routes/items.js';
import webhookRouter from './routes/webhook.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Apply rate limiting to API routes (except webhooks which need quick responses)
app.use('/api/items', apiRateLimiter);

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Initialize services
console.info('[Server] Initializing services...');
initializeDataStore();
initializeNotion(config.notion);
console.info('[Server] Services initialized');
console.info(
  `[Server] Configured databases: ${config.notion.databases.map(d => d.type).join(', ')}`
);

// Routes
app.use('/api/items', itemsRouter);
app.use('/api/webhook', webhookRouter);

// Health check
app.get('/api/health', (_req, res) => {
  const store = getDataStore();
  const stats = store.getStats();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databases: config.notion.databases.length,
    store: {
      initialized: stats.initialized,
      totalItems: stats.totalItems,
      lastUpdated: stats.lastUpdated,
    },
    webhookConfigured: !!config.webhook.secret,
  });
});

// Store stats endpoint (replaces cache stats)
app.get('/api/store/stats', (_req, res) => {
  const store = getDataStore();
  res.json({
    success: true,
    data: store.getStats(),
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

/**
 * Fetch initial data from Notion on startup.
 * Throws if initial load fails completely to prevent server from starting with empty data.
 */
async function loadInitialData(): Promise<void> {
  console.info('[Server] Fetching initial data from Notion...');

  const notion = getNotion();
  const store = getDataStore();

  const result = await notion.fetchAllItems();

  // If all databases failed, throw to prevent server from starting
  if (result.items.length === 0 && result.failedDatabases.length > 0) {
    const failedDetails = result.failedDatabases.map(db => `${db.type}: ${db.error}`).join('; ');
    throw new Error(`All databases failed to load: ${failedDetails}`);
  }

  store.initialize(result.items);

  console.info(`[Server] Loaded ${result.items.length} items from Notion`);

  if (result.failedDatabases.length > 0) {
    console.warn('[Server] Some databases failed to load:', result.failedDatabases);
    console.warn(
      '[Server] Server will continue with partial data. Use POST /api/items/sync to retry.'
    );
  }

  if (result.orphanedItemsCount > 0) {
    console.info(`[Server] ${result.orphanedItemsCount} orphaned items detected`);
  }
}

// Start server with initial data load
loadInitialData()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.info(`[Server] Running on http://localhost:${config.port}`);
      console.info(`[Server] CORS origin: ${config.corsOrigin}`);
      console.info(`[Server] Webhook endpoint: POST /api/webhook`);

      if (config.webhook.secret) {
        console.info('[Server] Webhook signature validation: ENABLED');
      } else {
        console.warn('[Server] Webhook signature validation: DISABLED (set NOTION_WEBHOOK_SECRET)');
      }
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
  })
  .catch((error: Error) => {
    console.error('[Server] Failed to load initial data:', error.message);
    console.error(
      '[Server] Server cannot start without data. Please check your Notion configuration.'
    );
    process.exit(1);
  });
