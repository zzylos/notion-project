import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { NotionConfig, PropertyMappings, DatabaseConfig } from './types/index.js';
import { DEFAULT_PROPERTY_MAPPINGS, ITEM_TYPES } from '../../shared/constants.js';

// Load .env from root directory (parent of server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(rootDir, '.env') });

/**
 * Server configuration loaded from environment variables
 */
export interface ServerConfig {
  port: number;
  corsOrigin: string;
  notion: NotionConfig;
  webhook: {
    /** Secret token for validating webhook signatures (from Notion verification) */
    secret: string | null;
  };
}

/**
 * Get an environment variable with optional VITE_ prefix fallback
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || process.env[`VITE_${key}`] || defaultValue;
}

/**
 * Parse and validate an integer environment variable
 */
function parseIntEnv(key: string, defaultValue: number, min?: number, max?: number): number {
  const value = parseInt(getEnvVar(key, String(defaultValue)) || String(defaultValue), 10);
  if (isNaN(value)) {
    throw new Error(`Invalid ${key}: must be a number.`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`Invalid ${key}: must be at least ${min}.`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`Invalid ${key}: must be at most ${max}.`);
  }
  return value;
}

/**
 * Build database configurations from environment variables
 */
function buildDatabaseConfigs(): DatabaseConfig[] {
  const databases: DatabaseConfig[] = [];

  for (const type of ITEM_TYPES) {
    const envKey = `NOTION_DB_${type.toUpperCase()}`;
    const databaseId = getEnvVar(envKey)?.trim();
    if (databaseId) {
      databases.push({ databaseId, type });
    }
  }

  return databases;
}

/**
 * Build property mappings from environment variables
 */
function buildPropertyMappings(): PropertyMappings {
  const mappingKeys: (keyof PropertyMappings)[] = [
    'title',
    'status',
    'priority',
    'owner',
    'parent',
    'progress',
    'dueDate',
    'tags',
  ];

  const envKeyMap: Record<keyof PropertyMappings, string> = {
    title: 'MAPPING_TITLE',
    status: 'MAPPING_STATUS',
    priority: 'MAPPING_PRIORITY',
    owner: 'MAPPING_OWNER',
    parent: 'MAPPING_PARENT',
    progress: 'MAPPING_PROGRESS',
    dueDate: 'MAPPING_DUE_DATE',
    tags: 'MAPPING_TAGS',
  };

  const mappings = { ...DEFAULT_PROPERTY_MAPPINGS };
  for (const key of mappingKeys) {
    const envValue = getEnvVar(envKeyMap[key]);
    if (envValue) {
      mappings[key] = envValue;
    }
  }

  return mappings;
}

/**
 * Validate a URL string
 */
function validateUrl(value: string, name: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid ${name}: ${value}. Must be a valid URL.`);
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const apiKey = getEnvVar('NOTION_API_KEY');
  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY (or VITE_NOTION_API_KEY) environment variable is required. ' +
        'Set it in the root .env file or as an environment variable.'
    );
  }

  const databases = buildDatabaseConfigs();
  if (databases.length === 0) {
    throw new Error(
      'At least one database ID is required. ' +
        'Set NOTION_DB_MISSION (or VITE_NOTION_DB_MISSION), etc. in the root .env file.'
    );
  }

  const port = parseIntEnv('PORT', 3001, 1, 65535);
  const corsOrigin = getEnvVar('CORS_ORIGIN', 'http://localhost:5173')!;
  validateUrl(corsOrigin, 'CORS_ORIGIN');

  // Webhook secret is optional - can be set after initial verification
  const webhookSecret = getEnvVar('NOTION_WEBHOOK_SECRET') || null;

  return {
    port,
    corsOrigin,
    notion: {
      apiKey,
      databases,
      defaultMappings: buildPropertyMappings(),
    },
    webhook: {
      secret: webhookSecret,
    },
  };
}

export const config = loadConfig();
