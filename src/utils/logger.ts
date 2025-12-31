/**
 * Unified logging utility for consistent console output across the application.
 *
 * Features:
 * - Consistent prefixing with component/module tags
 * - Color-coded output for better visual distinction
 * - Structured data logging with console.table
 * - Production-safe (can be easily disabled)
 * - Pre-configured namespace loggers for common modules
 *
 * @example
 * import { logger } from './utils/logger';
 *
 * // Using tag-based logging
 * logger.info('Notion', 'Fetching items...');
 * logger.warn('Store', 'Cache miss');
 *
 * // Using namespace loggers (preferred for consistency)
 * logger.notion.info('Fetching items...');
 * logger.store.warn('Cache miss');
 */

import type { LogLevel, NamespaceLogger } from '../../shared';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: 'color: #9ca3af', // gray
  info: 'color: #10b981', // green
  warn: 'color: #f59e0b', // amber
  error: 'color: #ef4444', // red
};

const config: LoggerConfig = {
  enabled: import.meta.env.DEV,
  minLevel: 'debug',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatTag(tag: string): string {
  return `[${tag}]`;
}

/**
 * Create a namespace logger for a specific module.
 * @param tag - The module/component identifier
 * @returns A logger bound to the specified tag
 */
function createNamespaceLogger(tag: string): NamespaceLogger {
  return {
    info(message: string, data?: unknown): void {
      if (!shouldLog('info')) return;
      console.info(`%c${formatTag(tag)} ${message}`, LOG_COLORS.info, data ?? '');
    },
    warn(message: string, data?: unknown): void {
      if (!shouldLog('warn')) return;
      console.warn(`${formatTag(tag)} ${message}`, data ?? '');
    },
    error(message: string, error?: unknown): void {
      if (!shouldLog('error')) return;
      console.error(`${formatTag(tag)} ${message}`, error ?? '');
    },
    debug(message: string, data?: unknown): void {
      if (!shouldLog('debug')) return;
      console.info(`%c${formatTag(tag)} ${message}`, LOG_COLORS.debug, data ?? '');
    },
  };
}

/**
 * Logger utility with consistent formatting and color-coded output.
 * Provides both tag-based methods and pre-configured namespace loggers.
 */
export const logger = {
  // Pre-configured namespace loggers for common modules
  /** Logger for Notion service operations */
  notion: createNamespaceLogger('Notion'),
  /** Logger for store/state operations */
  store: createNamespaceLogger('Store'),
  /** Logger for application-level events */
  app: createNamespaceLogger('App'),
  /** Logger for tree builder operations */
  tree: createNamespaceLogger('TreeBuilder'),
  /** Logger for cache operations */
  cache: createNamespaceLogger('Cache'),
  /** Logger for localStorage operations */
  localStorage: createNamespaceLogger('LocalStorage'),

  /**
   * Log an informational message.
   * @param tag - Component or module identifier (e.g., 'Notion', 'Store')
   * @param message - The message to log
   * @param data - Optional additional data to log
   */
  info(tag: string, message: string, data?: unknown): void {
    if (!shouldLog('info')) return;
    console.info(`%c${formatTag(tag)} ${message}`, LOG_COLORS.info, data ?? '');
  },

  /**
   * Log a warning message.
   * @param tag - Component or module identifier
   * @param message - The warning message
   * @param data - Optional additional data
   */
  warn(tag: string, message: string, data?: unknown): void {
    if (!shouldLog('warn')) return;
    console.warn(`${formatTag(tag)} ${message}`, data ?? '');
  },

  /**
   * Log an error message.
   * @param tag - Component or module identifier
   * @param message - The error message
   * @param error - Optional error object
   */
  error(tag: string, message: string, error?: unknown): void {
    if (!shouldLog('error')) return;
    console.error(`${formatTag(tag)} ${message}`, error ?? '');
  },

  /**
   * Log debug information (only in development).
   * @param tag - Component or module identifier
   * @param message - The debug message
   * @param data - Optional data to log
   */
  debug(tag: string, message: string, data?: unknown): void {
    if (!shouldLog('debug')) return;
    console.info(`%c${formatTag(tag)} ${message}`, LOG_COLORS.debug, data ?? '');
  },

  /**
   * Log tabular data using console.table.
   * @param tag - Component or module identifier
   * @param data - The data to display in table format
   * @param columns - Optional array of column names to display
   */
  table(tag: string, data: object[], columns?: string[]): void {
    if (!shouldLog('debug')) return;
    console.info(`%c${formatTag(tag)} Table data:`, LOG_COLORS.debug);
    console.table(data, columns);
  },

  /**
   * Configure the logger.
   * @param options - Partial configuration options
   */
  configure(options: Partial<LoggerConfig>): void {
    Object.assign(config, options);
  },

  /**
   * Enable or disable logging.
   * @param enabled - Whether logging should be enabled
   */
  setEnabled(enabled: boolean): void {
    config.enabled = enabled;
  },
};
