/**
 * Utility exports for the Notion Opportunity Tree Visualizer.
 *
 * These utilities provide common functionality used throughout the application.
 */

// Color utilities
export {
  getStatusCategory,
  getStatusColors,
  typeColors,
  typeHexColors,
  priorityColors,
} from './colors';

// Configuration
export {
  getEnvConfig,
  getMergedConfig,
  hasEnvConfig,
  isConfigUIDisabled,
  getRefreshCooldownMs,
  getLastRefreshTime,
  setLastRefreshTime,
  checkRefreshCooldown,
  migrateConfig,
} from './config';
export type { MigratedConfig } from './config';

// Date utilities
export { formatRelativeDate, formatDate, isOverdue } from './dateUtils';

// Error handling
export {
  ApiError,
  NetworkError,
  ValidationError,
  NotFoundError,
  withRetry,
  shouldRetry,
} from './errors';

// Icons
export { typeIcons } from './icons';

// Layout
export { calculateLayout } from './layoutCalculator';

// Logging
export { logger } from './logger';

// Sample data
export { sampleData } from './sampleData';

// Type guards
export {
  isAbortError,
  isNonEmptyString,
  isNonNullObject,
  getErrorMessage,
} from './typeGuards';

// Validation
export { isValidApiKey, isValidDatabaseId, sanitizeInput } from './validation';

// Array utilities
export { groupBy } from './arrayUtils';
