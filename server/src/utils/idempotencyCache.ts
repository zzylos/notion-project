import { logger } from './logger.js';
import { WEBHOOK } from '../../../shared/constants.js';

/**
 * Generic idempotency cache with TTL and memory bounds.
 * Prevents duplicate processing of events.
 */
class IdempotencyCache {
  private cache = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), WEBHOOK.CLEANUP_INTERVAL_MS);
    this.cleanupInterval.unref();
  }

  /**
   * Check if a key has already been processed.
   * If not, marks it as processed and returns false.
   * If already processed, returns true.
   */
  checkAndMark(key: string): boolean {
    const existing = this.cache.get(key);
    if (existing) {
      return true;
    }

    this.cache.set(key, Date.now());
    this.cleanup();
    return false;
  }

  /**
   * Clean up expired entries and enforce memory limit.
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Remove expired entries
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > WEBHOOK.IDEMPOTENCY_TTL_MS) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Enforce memory limit
    if (this.cache.size > WEBHOOK.MAX_CACHED_EVENTS) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, this.cache.size - WEBHOOK.MAX_CACHED_EVENTS);
      for (const [key] of toRemove) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.webhook.debug(`Cleaned ${cleaned} idempotency cache entries`);
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown).
   */
  stop(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
export const idempotencyCache = new IdempotencyCache();
