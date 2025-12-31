import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeDataStore, getDataStore } from './services/dataStore.js';
import { initializeNotion, getNotion } from './services/notion.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';
import itemsRouter from './routes/items.js';
import webhookRouter from './routes/webhook.js';
import type { RequestWithRawBody } from './types/express.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
// Capture raw body for webhook signature validation, then parse JSON
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // Store raw body buffer on request for signature verification
      // Type is augmented via types/express.d.ts
      (req as RequestWithRawBody).rawBody = buf;
    },
  })
);

// Apply rate limiting to API routes (except webhooks which need quick responses)
app.use('/api/items', apiRateLimiter);

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    logger.api.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Initialize services
logger.server.info('Initializing services...');
initializeDataStore();
initializeNotion(config.notion);
logger.server.info('Services initialized');
logger.server.info(`Configured databases: ${config.notion.databases.map(d => d.type).join(', ')}`);

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
  logger.server.error('Unhandled error:', err);

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
  logger.server.info('Fetching initial data from Notion...');

  const notion = getNotion();
  const store = getDataStore();

  const result = await notion.fetchAllItems();

  // If all databases failed, throw to prevent server from starting
  if (result.items.length === 0 && result.failedDatabases.length > 0) {
    const failedDetails = result.failedDatabases.map(db => `${db.type}: ${db.error}`).join('; ');
    throw new Error(`All databases failed to load: ${failedDetails}`);
  }

  store.initialize(result.items);

  logger.server.info(`Loaded ${result.items.length} items from Notion`);

  if (result.failedDatabases.length > 0) {
    logger.server.warn('Some databases failed to load:', result.failedDatabases);
    logger.server.warn(
      'Server will continue with partial data. Use POST /api/items/sync to retry.'
    );
  }

  if (result.orphanedItemsCount > 0) {
    logger.server.info(`${result.orphanedItemsCount} orphaned items detected`);
  }
}

// Start server with initial data load
loadInitialData()
  .then(() => {
    const server = app.listen(config.port, () => {
      logger.server.info(`Running on http://localhost:${config.port}`);
      logger.server.info(`CORS origin: ${config.corsOrigin}`);
      logger.server.info('Webhook endpoint: POST /api/webhook');

      if (config.webhook.secret) {
        logger.server.info('Webhook signature validation: ENABLED');
      } else {
        logger.server.warn('Webhook signature validation: DISABLED (set NOTION_WEBHOOK_SECRET)');
      }
    });

    // Handle server startup errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.server.error(`Port ${config.port} is already in use`);
      } else if (error.code === 'EACCES') {
        logger.server.error(`Port ${config.port} requires elevated privileges`);
      } else {
        logger.server.error('Failed to start:', error.message);
      }
      process.exit(1);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      logger.server.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        logger.server.info('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.server.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((error: Error) => {
    logger.server.error('Failed to load initial data:', error.message);
    logger.server.error(
      'Server cannot start without data. Please check your Notion configuration.'
    );
    process.exit(1);
  });
