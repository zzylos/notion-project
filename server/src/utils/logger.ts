/**
 * Server-side logger utility.
 *
 * Provides consistent logging with:
 * - Prefixed log messages for easy identification
 * - Conditional debug logging based on environment
 * - Structured output for different log levels
 */

interface LoggerOptions {
  /** Enable debug logging (default: only in non-production) */
  debug?: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format a log message with consistent prefix
 */
function formatMessage(prefix: string, message: string): string {
  return `[${prefix}] ${message}`;
}

/**
 * Create a logger instance for a specific module/component.
 *
 * @param prefix - Module name to prefix all log messages
 * @param options - Logger options
 * @returns Logger object with log methods
 *
 * @example
 * const logger = createLogger('Cache');
 * logger.info('Initialized');
 * logger.warn('Cache miss', { key: 'abc' });
 * logger.error('Failed to refresh', error);
 */
export function createLogger(prefix: string, options: LoggerOptions = {}) {
  const debugEnabled = options.debug ?? !isProduction;

  return {
    /**
     * Debug level - only in development by default.
     * Uses console.info with [DEBUG] prefix since console.debug is not allowed by ESLint.
     */
    debug(message: string, ...args: unknown[]): void {
      if (debugEnabled) {
        console.info(`[DEBUG] ${formatMessage(prefix, message)}`, ...args);
      }
    },

    /**
     * Info level - general informational messages
     */
    info(message: string, ...args: unknown[]): void {
      console.info(formatMessage(prefix, message), ...args);
    },

    /**
     * Warn level - warnings that don't stop execution
     */
    warn(message: string, ...args: unknown[]): void {
      console.warn(formatMessage(prefix, message), ...args);
    },

    /**
     * Error level - errors that may affect functionality
     */
    error(message: string, ...args: unknown[]): void {
      console.error(formatMessage(prefix, message), ...args);
    },
  };
}

/**
 * Pre-configured logger instances for common modules
 */
export const logger = {
  cache: createLogger('Cache'),
  notion: createLogger('Notion'),
  server: createLogger('Server'),
  api: createLogger('API'),
};

export default logger;
