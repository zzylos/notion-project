import type { WorkItem, ItemStatus } from '../types';
import { ApiError, NetworkError, isAbortError } from '../utils/errors';

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

interface FetchItemsResponse {
  items: WorkItem[];
  failedDatabases?: Array<{ type: string; error: string }>;
  orphanedItemsCount?: number;
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
   * Make a request to the backend API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
      });

      const data = (await response.json()) as ApiResponse<T>;

      if (!response.ok) {
        throw new ApiError(data.error || `HTTP error ${response.status}`, endpoint, {
          statusCode: response.status,
        });
      }

      return data;
    } catch (error) {
      // Re-throw abort errors
      if (isAbortError(error)) {
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
   * Invalidate the server cache
   */
  async invalidateCache(): Promise<void> {
    const endpoint = '/api/cache/invalidate';
    const response = await this.request<{ cleared: boolean }>(endpoint, {
      method: 'POST',
    });

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to invalidate cache', endpoint);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const endpoint = '/api/cache/stats';
    const response = await this.request<CacheStats>(endpoint);

    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Failed to get cache stats', endpoint);
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
