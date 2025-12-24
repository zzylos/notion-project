import 'dotenv/config';
import type { NotionConfig, PropertyMappings, DatabaseConfig, ItemType } from './types/index.js';

/**
 * Server configuration loaded from environment variables
 */
export interface ServerConfig {
  port: number;
  corsOrigin: string;
  notion: NotionConfig;
  cache: {
    ttlSeconds: number;
    checkPeriodSeconds: number;
  };
}

/**
 * Default property mappings (same as frontend)
 */
const DEFAULT_PROPERTY_MAPPINGS: PropertyMappings = {
  title: 'Name',
  status: 'Status',
  priority: 'Priority',
  owner: 'Owner',
  parent: 'Parent',
  progress: 'Progress',
  dueDate: 'Deadline',
  tags: 'Tags',
};

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const apiKey = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;

  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY environment variable is required. ' +
        'Set it in .env file or as an environment variable.'
    );
  }

  // Build databases array from environment variables
  const databases: DatabaseConfig[] = [];

  const dbMapping: Record<string, ItemType> = {
    NOTION_DB_MISSION: 'mission',
    NOTION_DB_PROBLEM: 'problem',
    NOTION_DB_SOLUTION: 'solution',
    NOTION_DB_PROJECT: 'project',
    NOTION_DB_DESIGN: 'design',
    // Also support VITE_ prefix for compatibility
    VITE_NOTION_DB_MISSION: 'mission',
    VITE_NOTION_DB_PROBLEM: 'problem',
    VITE_NOTION_DB_SOLUTION: 'solution',
    VITE_NOTION_DB_PROJECT: 'project',
    VITE_NOTION_DB_DESIGN: 'design',
  };

  for (const [envKey, type] of Object.entries(dbMapping)) {
    const databaseId = process.env[envKey];
    if (databaseId && databaseId.trim()) {
      // Avoid duplicates (VITE_ and non-VITE_ versions)
      const exists = databases.some(db => db.databaseId === databaseId);
      if (!exists) {
        databases.push({ databaseId, type });
      }
    }
  }

  if (databases.length === 0) {
    throw new Error(
      'At least one database ID is required. ' +
        'Set NOTION_DB_MISSION, NOTION_DB_PROBLEM, etc. in .env file.'
    );
  }

  // Load property mappings from environment
  const mappings: PropertyMappings = {
    title:
      process.env.MAPPING_TITLE ||
      process.env.VITE_MAPPING_TITLE ||
      DEFAULT_PROPERTY_MAPPINGS.title,
    status:
      process.env.MAPPING_STATUS ||
      process.env.VITE_MAPPING_STATUS ||
      DEFAULT_PROPERTY_MAPPINGS.status,
    priority:
      process.env.MAPPING_PRIORITY ||
      process.env.VITE_MAPPING_PRIORITY ||
      DEFAULT_PROPERTY_MAPPINGS.priority,
    owner:
      process.env.MAPPING_OWNER ||
      process.env.VITE_MAPPING_OWNER ||
      DEFAULT_PROPERTY_MAPPINGS.owner,
    parent:
      process.env.MAPPING_PARENT ||
      process.env.VITE_MAPPING_PARENT ||
      DEFAULT_PROPERTY_MAPPINGS.parent,
    progress:
      process.env.MAPPING_PROGRESS ||
      process.env.VITE_MAPPING_PROGRESS ||
      DEFAULT_PROPERTY_MAPPINGS.progress,
    dueDate:
      process.env.MAPPING_DUE_DATE ||
      process.env.VITE_MAPPING_DUE_DATE ||
      DEFAULT_PROPERTY_MAPPINGS.dueDate,
    tags:
      process.env.MAPPING_TAGS || process.env.VITE_MAPPING_TAGS || DEFAULT_PROPERTY_MAPPINGS.tags,
  };

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    notion: {
      apiKey,
      databases,
      defaultMappings: mappings,
    },
    cache: {
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10), // 5 minutes default
      checkPeriodSeconds: parseInt(process.env.CACHE_CHECK_PERIOD || '60', 10), // 1 minute check
    },
  };
}

export const config = loadConfig();
