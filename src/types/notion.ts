/**
 * Notion API type definitions.
 * These types represent the structure of data returned by the Notion API.
 */

/**
 * Represents a single property value from a Notion page.
 * Uses a discriminated union pattern based on the `type` field.
 */
export type NotionPropertyValue = {
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
};

/**
 * Represents a Notion page object from the API.
 */
export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
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
 * Progress callback parameter for streaming updates during fetching.
 */
export interface FetchProgress {
  /** Number of items loaded so far */
  loaded: number;
  /** Total items if known, null if unknown */
  total: number | null;
  /** Current items loaded */
  items: import('./index').WorkItem[];
  /** Whether fetching is complete */
  done: boolean;
  /** Currently fetching database type */
  currentDatabase?: string;
  /** Databases that failed to fetch */
  failedDatabases?: Array<{ type: string; error: string }>;
  /** Number of items with parent IDs pointing to non-existent items */
  orphanedItemsCount?: number;
}

/**
 * Callback type for progress updates during fetching.
 */
export type FetchProgressCallback = (progress: FetchProgress) => void;

/**
 * Options for fetch operations.
 */
export interface FetchOptions {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Callback for progress updates */
  onProgress?: FetchProgressCallback;
}
