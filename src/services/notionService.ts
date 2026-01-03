/**
 * NotionService - Orchestrates Notion API operations via backend server.
 *
 * This service delegates all API communication to the backend server,
 * which maintains a persistent in-memory DataStore updated via Notion webhooks.
 * This ensures users always see the latest data with real-time updates.
 */

import type { WorkItem, NotionConfig } from '../types';
import type { FetchOptions, FetchProgressCallback } from '../types/notion';
import { apiClient } from './apiClient';

// Re-export types for backward compatibility
export type { FetchProgressCallback, FetchOptions } from '../types/notion';

class NotionService {
  private config: NotionConfig | null = null;

  initialize(config: NotionConfig) {
    // Validate that we have at least one database configured
    const hasNewFormat = config.databases && config.databases.length > 0;
    const hasLegacyFormat = Boolean(config.databaseId);

    if (!hasNewFormat && !hasLegacyFormat) {
      throw new Error('Invalid config: at least one database must be configured');
    }

    // Validate database configs have required fields
    if (hasNewFormat) {
      for (const db of config.databases) {
        if (!db.databaseId || typeof db.databaseId !== 'string') {
          throw new Error('Invalid config: each database must have a valid databaseId');
        }
        if (!db.type) {
          throw new Error(`Invalid config: database ${db.databaseId} is missing a type`);
        }
      }
    }

    this.config = config;
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  async fetchAllItems(options?: FetchOptions): Promise<WorkItem[]> {
    const { signal, onProgress } = options || {};

    // Report that loading has started (for progress bar feedback)
    onProgress?.({
      loaded: 0,
      total: null,
      items: [],
      done: false,
      currentDatabase: 'backend',
    });

    const result = await apiClient.fetchItems(signal);

    onProgress?.({
      loaded: result.items.length,
      total: result.items.length,
      items: result.items,
      done: true,
      failedDatabases: result.failedDatabases,
      orphanedItemsCount: result.orphanedItemsCount,
    });

    return result.items;
  }

  async fetchItem(pageId: string): Promise<WorkItem> {
    return apiClient.fetchItem(pageId);
  }

  async updateItemStatus(pageId: string, status: string): Promise<void> {
    await apiClient.updateItemStatus(pageId, status);
  }

  async updateItemProgress(pageId: string, progress: number): Promise<void> {
    await apiClient.updateItemProgress(pageId, progress);
  }

  async invalidateServerCache(): Promise<void> {
    await apiClient.invalidateCache();
  }
}

export const notionService = new NotionService();
export default notionService;
