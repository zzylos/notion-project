import cron from 'node-cron';
import { getSyncService } from './syncService.js';
import { logger } from '../utils/logger.js';

/**
 * Cron expressions for scheduled tasks.
 *
 * Format: second(optional) minute hour day-of-month month day-of-week
 *
 * Note: node-cron supports 5 or 6 field expressions
 */
const CRON_EXPRESSIONS = {
  // Run every 24 hours at midnight
  INCREMENTAL_SYNC: '0 0 * * *', // minute 0, hour 0, every day

  // Run weekly on Sunday at midnight
  FULL_SYNC: '0 0 * * 0', // minute 0, hour 0, Sunday
};

/**
 * Scheduler Service - manages scheduled sync tasks using node-cron.
 *
 * Schedules:
 * - Incremental sync: Every 24 hours (fetches last 26 hours for overlap)
 * - Full sync: Every Sunday at midnight (reconciles deletions)
 */
class SchedulerService {
  private incrementalSyncTask: cron.ScheduledTask | null = null;
  private fullSyncTask: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the scheduler.
   * Initializes cron jobs for incremental and full syncs.
   */
  start(): void {
    if (this.isRunning) {
      logger.server.warn('Scheduler already running');
      return;
    }

    logger.server.info('Starting scheduler...');

    // Schedule incremental sync (every 24 hours)
    this.incrementalSyncTask = cron.schedule(
      CRON_EXPRESSIONS.INCREMENTAL_SYNC,
      async () => {
        await this.runIncrementalSync();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    // Schedule full sync (every Sunday at midnight)
    this.fullSyncTask = cron.schedule(
      CRON_EXPRESSIONS.FULL_SYNC,
      async () => {
        await this.runFullSync();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.isRunning = true;
    logger.server.info('Scheduler started');
    logger.server.info(
      `  - Incremental sync: ${CRON_EXPRESSIONS.INCREMENTAL_SYNC} (daily at midnight UTC)`
    );
    logger.server.info(`  - Full sync: ${CRON_EXPRESSIONS.FULL_SYNC} (Sundays at midnight UTC)`);
  }

  /**
   * Stop the scheduler.
   * Cancels all scheduled tasks.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.server.info('Stopping scheduler...');

    if (this.incrementalSyncTask) {
      this.incrementalSyncTask.stop();
      this.incrementalSyncTask = null;
    }

    if (this.fullSyncTask) {
      this.fullSyncTask.stop();
      this.fullSyncTask = null;
    }

    this.isRunning = false;
    logger.server.info('Scheduler stopped');
  }

  /**
   * Run an incremental sync manually.
   * Uses a 26-hour window for 2-hour overlap.
   */
  async runIncrementalSync(): Promise<void> {
    logger.notion.info('Scheduled incremental sync starting...');

    try {
      const syncService = getSyncService();
      const result = await syncService.performScheduledIncrementalSync();

      if (result.errors.length > 0) {
        logger.notion.warn(`Incremental sync completed with ${result.errors.length} errors`);
        for (const error of result.errors) {
          logger.notion.warn(`  - ${error}`);
        }
      } else {
        logger.notion.info(
          `Scheduled incremental sync completed: ${result.itemsProcessed} items in ${result.duration}ms`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.notion.error(`Scheduled incremental sync failed: ${message}`);
    }
  }

  /**
   * Run a full sync manually.
   */
  async runFullSync(): Promise<void> {
    logger.notion.info('Scheduled full sync starting...');

    try {
      const syncService = getSyncService();
      const result = await syncService.performFullSync();

      if (result.errors.length > 0) {
        logger.notion.warn(`Full sync completed with ${result.errors.length} errors`);
        for (const error of result.errors) {
          logger.notion.warn(`  - ${error}`);
        }
      } else {
        logger.notion.info(
          `Scheduled full sync completed: ${result.itemsProcessed} items in ${result.duration}ms`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.notion.error(`Scheduled full sync failed: ${message}`);
    }
  }

  /**
   * Get the next scheduled run times.
   */
  getNextScheduledRuns(): { incremental: Date | null; full: Date | null } {
    // Note: node-cron doesn't expose next run time directly
    // We calculate it based on the cron expressions

    const now = new Date();

    // Next midnight UTC for incremental sync
    const nextIncremental = new Date(now);
    nextIncremental.setUTCHours(0, 0, 0, 0);
    if (nextIncremental <= now) {
      nextIncremental.setUTCDate(nextIncremental.getUTCDate() + 1);
    }

    // Next Sunday midnight UTC for full sync
    const nextFull = new Date(now);
    nextFull.setUTCHours(0, 0, 0, 0);
    const daysUntilSunday = (7 - nextFull.getUTCDay()) % 7;
    if (daysUntilSunday === 0 && nextFull <= now) {
      nextFull.setUTCDate(nextFull.getUTCDate() + 7);
    } else {
      nextFull.setUTCDate(nextFull.getUTCDate() + daysUntilSunday);
    }

    return {
      incremental: this.isRunning ? nextIncremental : null,
      full: this.isRunning ? nextFull : null,
    };
  }

  /**
   * Check if the scheduler is running.
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

/**
 * Initialize the scheduler service.
 */
export function initializeScheduler(): SchedulerService {
  schedulerInstance = new SchedulerService();
  return schedulerInstance;
}

/**
 * Get the scheduler service instance.
 */
export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    throw new Error('Scheduler not initialized. Call initializeScheduler first.');
  }
  return schedulerInstance;
}

/**
 * Stop the scheduler.
 */
export function stopScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}

export { SchedulerService };
