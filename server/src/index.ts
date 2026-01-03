import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeDataStore, getDataStore } from './services/dataStore.js';
import { initializeNotion } from './services/notion.js';
import { initializeMongoDB, closeMongoDB, getMongoDB } from './services/mongodb.js';
import { initializeSyncState, getSyncState } from './services/syncState.js';
import { initializeSyncService, getSyncService } from './services/syncService.js';
import { initializeScheduler, stopScheduler, getScheduler } from './services/scheduler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';
import itemsRouter from './routes/items.js';
import webhookRouter from './routes/webhook.js';
import type { RequestWithRawBody } from './types/express.js';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.server.error('Unhandled Promise Rejection:', reason);
  logger.server.error('Promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.server.error('Uncaught Exception:', error.message);
  logger.server.error('Stack:', error.stack);
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
// Capture raw body for webhook signature validation, then parse JSON
// Limit body size to 1MB to prevent DoS attacks
app.use(
  express.json({
    limit: '1mb',
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

// Routes (registered before server start)
app.use('/api/items', itemsRouter);
app.use('/api/webhook', webhookRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  const store = getDataStore();
  const stats = store.getStats();
  const syncState = getSyncState();

  let mongoStats = null;
  try {
    const mongodb = getMongoDB();
    mongoStats = await mongodb.getStats();
  } catch {
    // MongoDB may not be connected
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databases: config.notion.databases.length,
    store: {
      initialized: stats.initialized,
      totalItems: stats.totalItems,
      lastUpdated: stats.lastUpdated,
    },
    mongodb: mongoStats,
    sync: {
      initialized: syncState.isInitialized(),
      lastFullSync: syncState.getState().lastFullSync,
      lastIncrementalSync: syncState.getState().lastIncrementalSync,
      needsFullSync: syncState.needsFullSync(),
    },
    webhookConfigured: !!config.webhook.secret,
  });
});

// Store stats endpoint
app.get('/api/store/stats', (_req, res) => {
  const store = getDataStore();
  res.json({
    success: true,
    data: store.getStats(),
  });
});

// Sync status endpoint
app.get('/api/sync/status', (_req, res) => {
  const syncState = getSyncState();
  const scheduler = getScheduler();
  const nextRuns = scheduler.getNextScheduledRuns();

  res.json({
    success: true,
    data: {
      state: syncState.getState(),
      scheduler: {
        running: scheduler.isSchedulerRunning(),
        nextIncrementalSync: nextRuns.incremental?.toISOString() ?? null,
        nextFullSync: nextRuns.full?.toISOString() ?? null,
      },
    },
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
 * Initialize all services and start the server.
 */
async function startServer(): Promise<void> {
  logger.server.info('Starting server...');

  // 1. Connect to MongoDB (fail if unavailable)
  logger.server.info('Connecting to MongoDB...');
  try {
    await initializeMongoDB(config.mongodb.uri, config.mongodb.dbName);
    logger.server.info('Connected to MongoDB');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.server.error(`Failed to connect to MongoDB: ${message}`);
    logger.server.error('Server cannot start without MongoDB. Please check your MONGODB_URI.');
    process.exit(1);
  }

  // 2. Initialize sync state manager
  logger.server.info('Loading sync state...');
  initializeSyncState();
  const syncState = getSyncState();
  syncState.markServerStartup();

  // 3. Initialize other services
  logger.server.info('Initializing services...');
  initializeDataStore();
  initializeNotion(config.notion);
  initializeSyncService();
  logger.server.info('Services initialized');
  logger.server.info(
    `Configured databases: ${config.notion.databases.map(d => d.type).join(', ')}`
  );

  // 4. Perform startup sync
  logger.server.info('Performing startup sync...');
  try {
    const syncService = getSyncService();
    const result = await syncService.performStartupSync();

    logger.server.info(
      `Startup sync completed: ${result.type} sync, ${result.itemsProcessed} items in ${result.duration}ms`
    );

    if (result.errors.length > 0) {
      logger.server.warn(`Sync completed with ${result.errors.length} errors:`);
      for (const error of result.errors) {
        logger.server.warn(`  - ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.server.error(`Startup sync failed: ${message}`);
    logger.server.error('Server cannot start without data. Please check your configuration.');
    await closeMongoDB();
    process.exit(1);
  }

  // 5. Start scheduler
  logger.server.info('Starting scheduler...');
  const scheduler = initializeScheduler();
  scheduler.start();

  // 6. Start HTTP server
  const server = app.listen(config.port, () => {
    logger.server.info(`Running on http://localhost:${config.port}`);
    logger.server.info(`CORS origin: ${config.corsOrigin}`);
    logger.server.info('Webhook endpoint: POST /api/webhook');

    if (config.webhook.secret) {
      logger.server.info('Webhook signature validation: ENABLED');
    } else {
      logger.server.warn('Webhook signature validation: DISABLED (set NOTION_WEBHOOK_SECRET)');
    }

    const store = getDataStore();
    const stats = store.getStats();
    logger.server.info(`Data loaded: ${stats.totalItems} items`);
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
  const gracefulShutdown = async (signal: string) => {
    logger.server.info(`${signal} received, shutting down gracefully...`);

    // Stop scheduler first
    logger.server.info('Stopping scheduler...');
    stopScheduler();

    // Mark server shutdown time for downtime tracking
    logger.server.info('Recording shutdown time...');
    try {
      const syncState = getSyncState();
      syncState.markServerShutdown();
    } catch (error) {
      logger.server.warn('Failed to record shutdown time:', error);
    }

    // Close HTTP server
    server.close(() => {
      logger.server.info('HTTP server closed');
    });

    // Close MongoDB connection
    logger.server.info('Closing MongoDB connection...');
    try {
      await closeMongoDB();
      logger.server.info('MongoDB connection closed');
    } catch (error) {
      logger.server.warn('Error closing MongoDB connection:', error);
    }

    logger.server.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Force exit after 10 seconds if graceful shutdown fails
  const forceExitTimeout = () => {
    setTimeout(() => {
      logger.server.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', forceExitTimeout);
  process.on('SIGINT', forceExitTimeout);
}

// Start the server
startServer().catch((error: Error) => {
  logger.server.error('Failed to start server:', error.message);
  process.exit(1);
});
