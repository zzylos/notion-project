/**
 * Shared type definitions for both client and server.
 * These types are used by the Notion API integration across the application.
 */

/**
 * Work item types in the opportunity tree.
 * Each type corresponds to a Notion database and represents a different level
 * in the opportunity hierarchy.
 */
export type ItemType = 'mission' | 'problem' | 'solution' | 'design' | 'project';

/**
 * Status of work items - dynamic string type.
 * Preserves the original Notion status value for display.
 */
export type ItemStatus = string;

/**
 * Priority levels for work items.
 * P0 is highest priority (Critical), P3 is lowest (Low).
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Owner/person information from Notion.
 */
export interface Owner {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

/**
 * A work item in the opportunity tree.
 */
export interface WorkItem {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  priority?: Priority;
  progress?: number;
  owner?: Owner;
  assignees?: Owner[];
  parentId?: string;
  children?: string[];
  description?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  notionPageId?: string;
  notionUrl?: string;
  tags?: string[];
  dependencies?: string[];
  blockedBy?: string[];
}

/**
 * Configuration for a single Notion database.
 */
export interface DatabaseConfig {
  databaseId: string;
  type: ItemType;
  mappings?: Partial<PropertyMappings>;
}

/**
 * Property name mappings for connecting Notion columns to work item fields.
 */
export interface PropertyMappings {
  title: string;
  status: string;
  priority: string;
  owner: string;
  parent: string;
  progress: string;
  dueDate: string;
  tags: string;
}

/**
 * Complete Notion configuration for the application.
 */
export interface NotionConfig {
  apiKey: string;
  databases: DatabaseConfig[];
  defaultMappings: PropertyMappings;
  /** @deprecated Use databases array instead */
  databaseId?: string;
  /** @deprecated Use defaultMappings instead */
  mappings?: PropertyMappings & { type: string };
}

/**
 * Notion page parent information.
 * A page can be a child of a database, another page, a block, or workspace.
 */
export interface NotionPageParent {
  type: 'database_id' | 'page_id' | 'block_id' | 'workspace';
  database_id?: string;
  page_id?: string;
  block_id?: string;
  workspace?: boolean;
}

/**
 * Notion API page object.
 */
export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
  parent?: NotionPageParent;
}

/**
 * Notion property value - supports all Notion property types.
 */
export interface NotionPropertyValue {
  id: string;
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  number?: number | null;
  date?: { start: string; end?: string } | null;
  people?: Array<{
    id: string;
    name?: string;
    avatar_url?: string;
    person?: { email?: string };
  }>;
  relation?: Array<{ id: string }>;
  formula?: {
    string?: string;
    number?: number;
    boolean?: boolean;
    date?: { start: string; end?: string };
  };
  rollup?: { number?: number; array?: NotionPropertyValue[]; type?: string };
  checkbox?: boolean;
  url?: string | null;
  status?: { name: string } | null;
  email?: string | null;
  phone_number?: string | null;
  created_time?: string;
  created_by?: { id: string; object: string };
  last_edited_time?: string;
  last_edited_by?: { id: string; object: string };
  files?: Array<{
    name: string;
    type: string;
    file?: { url: string };
    external?: { url: string };
  }>;
  unique_id?: { prefix?: string; number: number };
}

/**
 * Response from the Notion database query API.
 */
export interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Logger level types.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface for namespace-specific loggers.
 * Both client and server loggers implement this interface.
 */
export interface NamespaceLogger {
  /** Log a debug message (typically only in development) */
  debug(message: string, data?: unknown): void;
  /** Log an informational message */
  info(message: string, data?: unknown): void;
  /** Log a warning message */
  warn(message: string, data?: unknown): void;
  /** Log an error message */
  error(message: string, error?: unknown): void;
}

/**
 * Common namespace logger keys used across client and server.
 * This ensures consistency in log namespaces.
 */
export type CommonLoggerNamespace = 'notion' | 'store' | 'cache';
