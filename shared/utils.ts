/**
 * Shared utility functions for both client and server.
 */

import type { WorkItem } from './types.js';

/**
 * Orphaned item information for logging/debugging.
 */
export interface OrphanedItem {
  id: string;
  title: string;
  parentId: string;
}

/**
 * Options for buildRelationships function.
 */
export interface BuildRelationshipsOptions {
  /**
   * Callback when orphaned items are found.
   * Called with the list of orphaned items for logging purposes.
   */
  onOrphanedItems?: (items: OrphanedItem[]) => void;
}

/**
 * Build parent-child relationships between work items.
 *
 * Mutates the items array in place by populating the `children` arrays.
 * An item is considered "orphaned" if it has a parentId but that parent
 * doesn't exist in the items array.
 *
 * @param items - Array of work items to build relationships for (mutated in place)
 * @param options - Optional configuration including orphan callback
 * @returns The count of orphaned items (items with missing parents)
 *
 * @example
 * const items = [
 *   { id: 'a', parentId: undefined, children: [] },
 *   { id: 'b', parentId: 'a', children: [] }
 * ];
 * buildRelationships(items);
 * // items[0].children is now ['b']
 */
export function buildRelationships(items: WorkItem[], options?: BuildRelationshipsOptions): number {
  const itemMap = new Map(items.map(item => [item.id, item]));
  const orphanedItems: OrphanedItem[] = [];

  for (const item of items) {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item.id);
      } else {
        // Track orphaned items (have parentId but parent not found)
        orphanedItems.push({
          id: item.id,
          title: item.title,
          parentId: item.parentId,
        });
      }
    }
  }

  // Call the callback if there are orphaned items
  if (orphanedItems.length > 0 && options?.onOrphanedItems) {
    options.onOrphanedItems(orphanedItems);
  }

  return orphanedItems.length;
}

/**
 * Parse Notion API error response and return a user-friendly message.
 *
 * @param status - HTTP status code from the response
 * @param errorText - Raw error text from the response body
 * @returns A user-friendly error message
 *
 * @example
 * parseNotionError(401, '{"code":"unauthorized"}') // 'Invalid API key. Please check your Notion integration token.'
 * parseNotionError(404, '{}') // 'Database not found. Please verify the database ID...'
 */
export function parseNotionError(status: number, errorText: string): string {
  let errorCode = '';
  let errorMessage = '';
  try {
    const parsed = JSON.parse(errorText);
    errorCode = parsed.code || '';
    errorMessage = parsed.message || '';
  } catch {
    errorMessage = errorText;
  }

  switch (status) {
    case 401:
      return 'Invalid API key. Please check your Notion integration token.';
    case 403:
      return 'Access denied. Make sure you have shared the database with your integration.';
    case 404:
      return 'Database not found. Please verify the database ID and ensure it is shared with your integration.';
    case 429:
      return 'Rate limited by Notion API. Please wait a moment and try again.';
    case 400:
      if (errorCode === 'validation_error') {
        return `Invalid request: ${errorMessage}`;
      }
      return `Bad request: ${errorMessage || 'Please check your configuration.'}`;
    case 500:
    case 502:
    case 503:
      return 'Notion API is temporarily unavailable. Please try again later.';
    default:
      return `Notion API error (${status}): ${errorMessage || 'Unknown error'}`;
  }
}

/**
 * Normalize a Notion UUID to consistent format (with dashes).
 *
 * Notion sometimes returns IDs with or without dashes depending on context.
 * This function ensures all UUIDs have the standard format: 8-4-4-4-12
 *
 * @param id - The UUID to normalize (with or without dashes)
 * @returns The normalized UUID with dashes, or empty string if invalid input
 *
 * @example
 * normalizeUuid('12345678123412341234123456789abc') // '12345678-1234-1234-1234-123456789abc'
 * normalizeUuid('12345678-1234-1234-1234-123456789abc') // '12345678-1234-1234-1234-123456789abc'
 */
export function normalizeUuid(id: string): string {
  // Validate input
  if (!id || typeof id !== 'string') {
    return '';
  }

  // Remove any existing dashes and convert to lowercase
  const clean = id.replace(/-/g, '').toLowerCase();

  // If it's not a valid UUID length, return as-is
  if (clean.length !== 32) {
    return id;
  }

  // Validate that it only contains valid hex characters
  if (!/^[0-9a-f]+$/.test(clean)) {
    return id;
  }

  // Insert dashes in standard UUID positions: 8-4-4-4-12
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}
