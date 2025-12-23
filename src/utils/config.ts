import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../types';
import { DEFAULT_PROPERTY_MAPPINGS } from '../constants';

/**
 * Configuration loader that supports:
 * 1. Environment variables (.env file) - highest priority for API keys
 * 2. localStorage (UI settings) - for user overrides
 *
 * This allows developers to set up their config once in .env
 * without having to enter it in the UI every time.
 */

// Get environment variable with Vite's import.meta.env
const getEnv = (key: string): string | undefined => {
  return import.meta.env[key] as string | undefined;
};

// Load configuration from environment variables
export function getEnvConfig(): NotionConfig | null {
  const apiKey = getEnv('VITE_NOTION_API_KEY');

  // If no API key in env, return null (will fall back to localStorage)
  if (!apiKey) {
    return null;
  }

  // Build database configs from env vars
  const databases: DatabaseConfig[] = [];
  const dbEnvMap: Record<ItemType, string> = {
    mission: 'VITE_NOTION_DB_MISSION',
    problem: 'VITE_NOTION_DB_PROBLEM',
    solution: 'VITE_NOTION_DB_SOLUTION',
    project: 'VITE_NOTION_DB_PROJECT',
    design: 'VITE_NOTION_DB_DESIGN',
  };

  for (const [type, envKey] of Object.entries(dbEnvMap) as [ItemType, string][]) {
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

  // Build property mappings from env vars (with defaults)
  const defaultMappings: PropertyMappings = {
    title: getEnv('VITE_MAPPING_TITLE') || 'Name',
    status: getEnv('VITE_MAPPING_STATUS') || 'Status',
    priority: getEnv('VITE_MAPPING_PRIORITY') || 'Priority',
    owner: getEnv('VITE_MAPPING_OWNER') || 'Owner',
    parent: getEnv('VITE_MAPPING_PARENT') || 'Parent',
    progress: getEnv('VITE_MAPPING_PROGRESS') || 'Progress',
    dueDate: getEnv('VITE_MAPPING_DUE_DATE') || 'Deadline',
    tags: getEnv('VITE_MAPPING_TAGS') || 'Tags',
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
  const dbEnvKeys = [
    'VITE_NOTION_DB_MISSION',
    'VITE_NOTION_DB_PROBLEM',
    'VITE_NOTION_DB_SOLUTION',
    'VITE_NOTION_DB_PROJECT',
    'VITE_NOTION_DB_DESIGN',
  ];

  return dbEnvKeys.some(key => {
    const val = getEnv(key);
    return val && val.trim().length > 0;
  });
}

// Merge env config with stored config (env takes precedence for API key)
export function getMergedConfig(storedConfig: NotionConfig | null): NotionConfig | null {
  const envConfig = getEnvConfig();

  // If env config exists and is complete, use it
  if (envConfig) {
    console.info('%c[Config] Using configuration from environment variables', 'color: #10b981');
    return envConfig;
  }

  // Otherwise use stored config
  if (storedConfig) {
    console.info('%c[Config] Using configuration from localStorage', 'color: #3b82f6');
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
 * Convert legacy or current NotionConfig to a UI-friendly format.
 * Handles both old single-database format and new multi-database format.
 *
 * @param config - The NotionConfig to migrate (or null for defaults)
 * @returns A UI-friendly format with separate fields for each database type
 */
export function migrateConfig(config: NotionConfig | null): MigratedConfig {
  const databases: Record<ItemType, string> = {
    mission: '',
    problem: '',
    solution: '',
    project: '',
    design: '',
  };

  if (!config) {
    return { apiKey: '', databases, mappings: { ...DEFAULT_PROPERTY_MAPPINGS } };
  }

  // If we have the new format
  if (config.databases && config.databases.length > 0) {
    config.databases.forEach(db => {
      databases[db.type] = db.databaseId;
    });
    return {
      apiKey: config.apiKey,
      databases,
      mappings: config.defaultMappings || { ...DEFAULT_PROPERTY_MAPPINGS },
    };
  }

  // Legacy format - put the single database ID in project
  if (config.databaseId) {
    databases.project = config.databaseId;
  }

  return {
    apiKey: config.apiKey,
    databases,
    mappings: config.mappings
      ? {
          title: config.mappings.title,
          status: config.mappings.status,
          priority: config.mappings.priority,
          owner: config.mappings.owner,
          parent: config.mappings.parent,
          progress: config.mappings.progress,
          dueDate: config.mappings.dueDate,
          tags: config.mappings.tags,
        }
      : { ...DEFAULT_PROPERTY_MAPPINGS },
  };
}
