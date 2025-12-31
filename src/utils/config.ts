import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../types';
import { DEFAULT_PROPERTY_MAPPINGS, REFRESH, ITEM_TYPES } from '../constants';
import { logger } from './logger';

/**
 * Configuration loader that supports:
 * 1. Environment variables (.env file) - highest priority for API keys
 * 2. localStorage (UI settings) - for user overrides
 *
 * This allows developers to set up their config once in .env
 * without having to enter it in the UI every time.
 *
 * Production settings:
 * - VITE_DISABLE_CONFIG_UI: When 'true', disables UI-based configuration
 * - VITE_REFRESH_COOLDOWN_MINUTES: Minimum minutes between refreshes (default: 2)
 */

// Get environment variable with Vite's import.meta.env
const getEnv = (key: string): string | undefined => {
  return import.meta.env[key] as string | undefined;
};

/**
 * Check if UI configuration is disabled via environment variable.
 * When true, users cannot modify API keys, database IDs, or property mappings via the UI.
 * Configuration must be done via .env file instead.
 */
export function isConfigUIDisabled(): boolean {
  const value = getEnv('VITE_DISABLE_CONFIG_UI');
  return value?.toLowerCase() === 'true';
}

/**
 * Get the refresh cooldown duration in milliseconds.
 * Configurable via VITE_REFRESH_COOLDOWN_MINUTES environment variable.
 * Defaults to 2 minutes.
 */
export function getRefreshCooldownMs(): number {
  const minutesStr = getEnv('VITE_REFRESH_COOLDOWN_MINUTES');
  if (minutesStr) {
    const minutes = parseFloat(minutesStr);
    if (!isNaN(minutes) && minutes >= 0) {
      return minutes * 60 * 1000;
    }
  }
  return REFRESH.DEFAULT_COOLDOWN_MS;
}

/**
 * Get the last refresh timestamp from localStorage.
 */
export function getLastRefreshTime(): number | null {
  try {
    const value = localStorage.getItem(REFRESH.LAST_REFRESH_KEY);
    if (value) {
      const timestamp = parseInt(value, 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
  } catch (error) {
    logger.warn('Config', 'Failed to read last refresh time:', error);
  }
  return null;
}

/**
 * Set the last refresh timestamp in localStorage.
 */
export function setLastRefreshTime(timestamp: number): void {
  try {
    localStorage.setItem(REFRESH.LAST_REFRESH_KEY, timestamp.toString());
  } catch (error) {
    logger.warn('Config', 'Failed to save last refresh time:', error);
  }
}

/**
 * Check if a refresh is allowed based on the cooldown period.
 * Returns an object with:
 * - allowed: whether refresh is allowed
 * - remainingMs: milliseconds until next refresh is allowed (0 if allowed)
 */
export function checkRefreshCooldown(): { allowed: boolean; remainingMs: number } {
  const lastRefresh = getLastRefreshTime();
  const cooldownMs = getRefreshCooldownMs();

  if (!lastRefresh) {
    return { allowed: true, remainingMs: 0 };
  }

  const elapsed = Date.now() - lastRefresh;
  const remaining = cooldownMs - elapsed;

  if (remaining <= 0) {
    return { allowed: true, remainingMs: 0 };
  }

  return { allowed: false, remainingMs: remaining };
}

// Load configuration from environment variables
export function getEnvConfig(): NotionConfig | null {
  const apiKey = getEnv('VITE_NOTION_API_KEY');

  // If no API key in env, return null (will fall back to localStorage)
  if (!apiKey) {
    return null;
  }

  // Build database configs from env vars
  const databases: DatabaseConfig[] = [];

  for (const type of ITEM_TYPES) {
    const envKey = `VITE_NOTION_DB_${type.toUpperCase()}`;
    const dbId = getEnv(envKey);
    if (dbId && dbId.trim()) {
      databases.push({
        databaseId: dbId.trim(),
        type,
      });
    }
  }

  // If no databases configured, return null
  if (databases.length === 0) {
    return null;
  }

  // Build property mappings from env vars (with defaults from shared constants)
  const defaultMappings: PropertyMappings = {
    title: getEnv('VITE_MAPPING_TITLE') || DEFAULT_PROPERTY_MAPPINGS.title,
    status: getEnv('VITE_MAPPING_STATUS') || DEFAULT_PROPERTY_MAPPINGS.status,
    priority: getEnv('VITE_MAPPING_PRIORITY') || DEFAULT_PROPERTY_MAPPINGS.priority,
    owner: getEnv('VITE_MAPPING_OWNER') || DEFAULT_PROPERTY_MAPPINGS.owner,
    parent: getEnv('VITE_MAPPING_PARENT') || DEFAULT_PROPERTY_MAPPINGS.parent,
    progress: getEnv('VITE_MAPPING_PROGRESS') || DEFAULT_PROPERTY_MAPPINGS.progress,
    dueDate: getEnv('VITE_MAPPING_DUE_DATE') || DEFAULT_PROPERTY_MAPPINGS.dueDate,
    tags: getEnv('VITE_MAPPING_TAGS') || DEFAULT_PROPERTY_MAPPINGS.tags,
  };

  return {
    apiKey,
    databases,
    defaultMappings,
    // For legacy support
    databaseId: databases[0]?.databaseId,
  };
}

// Check if env config is available
export function hasEnvConfig(): boolean {
  const apiKey = getEnv('VITE_NOTION_API_KEY');
  if (!apiKey) return false;

  // Check if at least one database is configured
  return ITEM_TYPES.some(type => {
    const val = getEnv(`VITE_NOTION_DB_${type.toUpperCase()}`);
    return val && val.trim().length > 0;
  });
}

// Merge env config with stored config (env takes precedence for API key)
export function getMergedConfig(storedConfig: NotionConfig | null): NotionConfig | null {
  const envConfig = getEnvConfig();

  // If env config exists and is complete, use it
  if (envConfig) {
    logger.info('Config', 'Using configuration from environment variables');
    return envConfig;
  }

  // Otherwise use stored config
  if (storedConfig) {
    logger.info('Config', 'Using configuration from localStorage');
  }

  return storedConfig;
}

/**
 * Migrated config format for UI display.
 * Converts between the internal NotionConfig format and UI-friendly format.
 */
export interface MigratedConfig {
  apiKey: string;
  databases: Record<ItemType, string>;
  mappings: PropertyMappings;
}

/**
 * Create default empty database map
 */
function createEmptyDatabaseMap(): Record<ItemType, string> {
  return ITEM_TYPES.reduce(
    (acc, type) => {
      acc[type] = '';
      return acc;
    },
    {} as Record<ItemType, string>
  );
}

/**
 * Create default migrated config
 */
function createDefaultMigratedConfig(): MigratedConfig {
  return {
    apiKey: '',
    databases: createEmptyDatabaseMap(),
    mappings: { ...DEFAULT_PROPERTY_MAPPINGS },
  };
}

/**
 * Safely extract API key from config
 */
function extractApiKey(config: NotionConfig): string {
  return typeof config.apiKey === 'string' ? config.apiKey : '';
}

/**
 * Migrate legacy mappings format to current format
 */
function migrateLegacyMappings(mappings: PropertyMappings & { type: string }): PropertyMappings {
  return {
    title: mappings.title || DEFAULT_PROPERTY_MAPPINGS.title,
    status: mappings.status || DEFAULT_PROPERTY_MAPPINGS.status,
    priority: mappings.priority || DEFAULT_PROPERTY_MAPPINGS.priority,
    owner: mappings.owner || DEFAULT_PROPERTY_MAPPINGS.owner,
    parent: mappings.parent || DEFAULT_PROPERTY_MAPPINGS.parent,
    progress: mappings.progress || DEFAULT_PROPERTY_MAPPINGS.progress,
    dueDate: mappings.dueDate || DEFAULT_PROPERTY_MAPPINGS.dueDate,
    tags: mappings.tags || DEFAULT_PROPERTY_MAPPINGS.tags,
  };
}

/**
 * Check if config uses the new multi-database format
 */
function hasNewDatabaseFormat(config: NotionConfig): boolean {
  return !!(config.databases && Array.isArray(config.databases) && config.databases.length > 0);
}

/**
 * Populate database map from config.databases array
 */
function populateDatabaseMap(config: NotionConfig, databases: Record<ItemType, string>): void {
  if (!config.databases) return;
  for (const db of config.databases) {
    const isValid = db && typeof db.type === 'string' && typeof db.databaseId === 'string';
    if (isValid && db.type in databases) {
      databases[db.type as ItemType] = db.databaseId;
    }
  }
}

/**
 * Convert legacy or current NotionConfig to a UI-friendly format.
 * Handles both old single-database format and new multi-database format.
 *
 * @param config - The NotionConfig to migrate (or null for defaults)
 * @returns A UI-friendly format with separate fields for each database type
 */
export function migrateConfig(config: NotionConfig | null): MigratedConfig {
  if (!config || typeof config !== 'object') {
    if (config !== null) {
      logger.warn('Config', 'Invalid config object, using defaults');
    }
    return createDefaultMigratedConfig();
  }

  const databases = createEmptyDatabaseMap();

  // Handle new multi-database format
  if (hasNewDatabaseFormat(config)) {
    populateDatabaseMap(config, databases);
    return {
      apiKey: extractApiKey(config),
      databases,
      mappings: config.defaultMappings || { ...DEFAULT_PROPERTY_MAPPINGS },
    };
  }

  // Handle legacy single-database format
  if (config.databaseId && typeof config.databaseId === 'string') {
    databases.project = config.databaseId;
  }

  return {
    apiKey: extractApiKey(config),
    databases,
    mappings: config.mappings
      ? migrateLegacyMappings(config.mappings)
      : { ...DEFAULT_PROPERTY_MAPPINGS },
  };
}
