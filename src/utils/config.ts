import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../types';
import { DEFAULT_PROPERTY_MAPPINGS, REFRESH, ITEM_TYPES } from '../constants';

/**
 * Configuration loader that supports:
 * 1. Environment variables (.env file)
 * 2. localStorage (UI settings)
 */

const getEnv = (key: string): string | undefined => {
  return import.meta.env[key] as string | undefined;
};

export function isConfigUIDisabled(): boolean {
  const value = getEnv('VITE_DISABLE_CONFIG_UI');
  return value?.toLowerCase() === 'true';
}

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

export function getLastRefreshTime(): number | null {
  try {
    const value = localStorage.getItem(REFRESH.LAST_REFRESH_KEY);
    if (value) {
      const timestamp = parseInt(value, 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function setLastRefreshTime(timestamp: number): void {
  try {
    localStorage.setItem(REFRESH.LAST_REFRESH_KEY, timestamp.toString());
  } catch {
    // Ignore errors
  }
}

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

export function getEnvConfig(): NotionConfig | null {
  const apiKey = getEnv('VITE_NOTION_API_KEY');

  if (!apiKey) {
    return null;
  }

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

  if (databases.length === 0) {
    return null;
  }

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
    databaseId: databases[0]?.databaseId,
  };
}

export function hasEnvConfig(): boolean {
  const apiKey = getEnv('VITE_NOTION_API_KEY');
  if (!apiKey) return false;

  return ITEM_TYPES.some(type => {
    const val = getEnv(`VITE_NOTION_DB_${type.toUpperCase()}`);
    return val && val.trim().length > 0;
  });
}

export function getMergedConfig(storedConfig: NotionConfig | null): NotionConfig | null {
  const envConfig = getEnvConfig();

  if (envConfig) {
    return envConfig;
  }

  return storedConfig;
}

export interface MigratedConfig {
  apiKey: string;
  databases: Record<ItemType, string>;
  mappings: PropertyMappings;
}

function createEmptyDatabaseMap(): Record<ItemType, string> {
  return ITEM_TYPES.reduce(
    (acc, type) => {
      acc[type] = '';
      return acc;
    },
    {} as Record<ItemType, string>
  );
}

function createDefaultMigratedConfig(): MigratedConfig {
  return {
    apiKey: '',
    databases: createEmptyDatabaseMap(),
    mappings: { ...DEFAULT_PROPERTY_MAPPINGS },
  };
}

function extractApiKey(config: NotionConfig): string {
  return typeof config.apiKey === 'string' ? config.apiKey : '';
}

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

function hasNewDatabaseFormat(config: NotionConfig): boolean {
  return !!(config.databases && Array.isArray(config.databases) && config.databases.length > 0);
}

function populateDatabaseMap(config: NotionConfig, databases: Record<ItemType, string>): void {
  if (!config.databases) return;
  for (const db of config.databases) {
    const isValid = db && typeof db.type === 'string' && typeof db.databaseId === 'string';
    if (isValid && db.type in databases) {
      databases[db.type as ItemType] = db.databaseId;
    }
  }
}

export function migrateConfig(config: NotionConfig | null): MigratedConfig {
  if (!config || typeof config !== 'object') {
    return createDefaultMigratedConfig();
  }

  const databases = createEmptyDatabaseMap();

  if (hasNewDatabaseFormat(config)) {
    populateDatabaseMap(config, databases);
    return {
      apiKey: extractApiKey(config),
      databases,
      mappings: config.defaultMappings || { ...DEFAULT_PROPERTY_MAPPINGS },
    };
  }

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
