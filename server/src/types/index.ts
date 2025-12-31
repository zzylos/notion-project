/**
 * Server type definitions.
 *
 * Core types (WorkItem, NotionConfig, etc.) are imported from the shared module.
 * This file only defines server-specific types (API responses, etc.).
 */

// Re-export all shared types for convenient imports (includes FetchItemsResponse)
export * from '../../../shared/types.js';

// Server-specific API response types

/**
 * Standard API response wrapper for all endpoints.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Statistics about the data store.
 */
export interface StoreStats {
  totalItems: number;
  initialized: boolean;
  lastUpdated: string | null;
  itemsByType: Record<string, number>;
}
