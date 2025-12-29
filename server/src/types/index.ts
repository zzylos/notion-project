/**
 * Shared types for the Notion API server.
 * These mirror the frontend types for consistency.
 */

export type ItemType = 'mission' | 'problem' | 'solution' | 'design' | 'project';

export type ItemStatus = string;

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Owner {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

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

export interface DatabaseConfig {
  databaseId: string;
  type: ItemType;
  mappings?: Partial<PropertyMappings>;
}

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

export interface NotionConfig {
  apiKey: string;
  databases: DatabaseConfig[];
  defaultMappings: PropertyMappings;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FetchItemsResponse {
  items: WorkItem[];
  failedDatabases?: Array<{ type: string; error: string }>;
  orphanedItemsCount?: number;
  lastUpdated?: string;
}

export interface StoreStats {
  totalItems: number;
  initialized: boolean;
  lastUpdated: string | null;
  itemsByType: Record<string, number>;
}

// Notion API types

/**
 * Parent of a Notion page - indicates where the page lives
 */
export interface NotionPageParent {
  type: 'database_id' | 'page_id' | 'workspace' | 'block_id';
  database_id?: string;
  page_id?: string;
  block_id?: string;
  workspace?: boolean;
}

export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
  parent?: NotionPageParent;
}

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

export interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}
