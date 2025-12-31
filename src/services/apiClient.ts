import type { WorkItem, ItemStatus, FetchItemsResponse } from '../types';
import { NETWORK } from '../../shared';
import { ApiError, NetworkError, isAbortError } from '../utils/errors';

const FETCH_TIMEOUT_MS = NETWORK.FETCH_TIMEOUT_MS;

/**
 * API response wrapper type
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cacheAge?: number;
}

interface CacheStats {
  entries: number;
  keys: string[];
  hitRate: number;
  hits: number;
  misses: number;
}

/**
 * Client for communicating with the backend API server.
 * Used when VITE_USE_BACKEND_API=true.
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    // Default to localhost:3001 for development
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Make a request to the backend API with timeout
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Create abort controller for timeout, but respect provided signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // If a signal is provided, abort our controller when it aborts
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
      });

      let data: ApiResponse<T>;
      try {
        data = (await response.json()) as ApiResponse<T>;
      } catch {
        throw new ApiError(
          `Failed to parse API response: Invalid JSON from ${endpoint}`,
          endpoint,
          { statusCode: response.status }
        );
      }

      if (!response.ok) {
        throw new ApiError(data.error || `HTTP error ${response.status}`, endpoint, {
          statusCode: response.status,
        });
      }

      return data;
    } catch (error) {
      // Re-throw abort errors (including timeout)
      if (isAbortError(error)) {
        // Check if it was our timeout vs user cancellation
        if (!signal?.aborted) {
          throw new NetworkError(
            `Request to ${endpoint} timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          );
        }
        throw error;
      }

      // Re-throw ApiError instances
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new NetworkError(
          `Unable to connect to backend at ${this.baseUrl}. Make sure the server is running.`
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch all items from the backend
   */
  async fetchItems(signal?: AbortSignal): Promise<{
    items: WorkItem[];
    cached: boolean;
    cacheAge?: number;
    failedDatabases?: Array<{ type: string; error: string }>;
    orphanedItemsCount?: number;
  }> {
    const response = await this.request<FetchItemsResponse>('/api/items', {}, signal);

    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Failed to fetch items', '/api/items');
    }

    return {
      items: response.data.items,
      cached: response.cached || false,
      cacheAge: response.cacheAge,
      failedDatabases: response.data.failedDatabases,
      orphanedItemsCount: response.data.orphanedItemsCount,
    };
  }

  /**
   * Fetch a single item by ID
   */
  async fetchItem(pageId: string): Promise<WorkItem> {
    const endpoint = `/api/items/${pageId}`;
    const response = await this.request<WorkItem>(endpoint);

    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Failed to fetch item', endpoint);
    }

    return response.data;
  }

  /**
   * Update item status
   */
  async updateItemStatus(pageId: string, status: ItemStatus): Promise<void> {
    const endpoint = `/api/items/${pageId}/status`;
    const response = await this.request<{ updated: boolean }>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to update status', endpoint);
    }
  }

  /**
   * Update item progress
   */
  async updateItemProgress(pageId: string, progress: number): Promise<void> {
    const endpoint = `/api/items/${pageId}/progress`;
    const response = await this.request<{ updated: boolean }>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    });

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to update progress', endpoint);
    }
  }

  /**
   * Invalidate the server cache by triggering a full re-sync from Notion.
   * This replaces the old cache-based architecture with the new DataStore.
   */
  async invalidateCache(): Promise<void> {
    const endpoint = '/api/items/sync';
    const response = await this.request<FetchItemsResponse>(endpoint, {
      method: 'POST',
    });

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to sync data from Notion', endpoint);
    }
  }

  /**
   * Get store statistics (replaces old cache stats)
   */
  async getCacheStats(): Promise<CacheStats> {
    const endpoint = '/api/store/stats';
    const response = await this.request<CacheStats>(endpoint);

    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Failed to get store stats', endpoint);
    }

    return response.data;
  }

  /**
   * Check if the backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/api/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
