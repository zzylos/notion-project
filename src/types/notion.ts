/**
 * Notion API type definitions.
 *
 * This module re-exports shared Notion types and defines client-specific
 * types for fetch operations with progress tracking.
 */

import type { WorkItem } from '../../shared/types';

// Re-export shared Notion types
export type { NotionPropertyValue, NotionPage, NotionQueryResponse } from '../../shared/types';

/**
 * Progress callback parameter for streaming updates during fetching.
 */
export interface FetchProgress {
  /** Number of items loaded so far */
  loaded: number;
  /** Total items if known, null if unknown */
  total: number | null;
  /** Current items loaded */
  items: WorkItem[];
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
