/**
 * Utility exports for the Notion Opportunity Tree Visualizer.
 *
 * These utilities provide common functionality used throughout the application.
 */

// Color utilities
export {
  getStatusCategory,
  getStatusColors,
  getStatusStyle,
  getStatusHexColor,
  getProgressColor,
  getUniqueStatuses,
  typeColors,
  typeHexColors,
  priorityColors,
  typeLabels,
  priorityLabels,
} from './colors';
export type { StatusStyle } from './colors';

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
export { parseDate, formatDate, isOverdue, getRelativeTime } from './dateUtils';

// Error handling
export {
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  getHttpErrorMessage,
  parseApiError,
  shouldRetry,
  withRetry,
  formatErrorForDisplay,
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
  isError,
  isObject,
  isNonEmptyString,
  isValidNumber,
  isNonEmptyArray,
  hasProperty,
  isNullish,
  assertDefined,
  getErrorMessage,
} from './typeGuards';

// Validation
export { isValidApiKey, isValidDatabaseId, isValidEmail, isValidNotionUrl } from './validation';

// Array utilities
export { toggleArrayItem, includesItem, unique } from './arrayUtils';

// Tree building utilities
export { buildTreeNodes, getItemPath, buildChildMap } from './treeBuilder';
export type { TreeBuildState } from './treeBuilder';
