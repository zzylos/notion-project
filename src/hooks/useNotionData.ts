import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { notionService } from '../services/notionService';
import { sampleData } from '../utils/sampleData';
import { logger } from '../utils/logger';
import type { NotionConfig, WorkItem } from '../types';

/**
 * Loading progress state for data fetching.
 */
export interface LoadingProgress {
  loaded: number;
  total: number | null;
}

/**
 * Failed database information for error display.
 */
export interface FailedDatabase {
  type: string;
  error: string;
}

/**
 * Return type for the useNotionData hook.
 */
export interface UseNotionDataReturn {
  /** Whether we're using demo data instead of real Notion data */
  isUsingDemoData: boolean;
  /** Current loading progress */
  loadingProgress: LoadingProgress | null;
  /** List of databases that failed to load */
  failedDatabases: FailedDatabase[] | null;
  /** Clear the failed databases list */
  clearFailedDatabases: () => void;
  /** Force refresh data from Notion (bypasses cache) */
  refreshData: () => Promise<void>;
  /** Load data with the given config */
  loadData: (config: NotionConfig | null, forceRefresh?: boolean) => Promise<void>;
}

/**
 * Check if a NotionConfig has valid credentials for connecting to Notion.
 */
function hasValidNotionConfig(config: NotionConfig | null): config is NotionConfig {
  return Boolean(
    config?.apiKey && (config.databaseId || (config.databases && config.databases.length > 0))
  );
}

/**
 * Hook for managing Notion data fetching with progressive loading.
 *
 * This hook encapsulates all the data loading logic including:
 * - Loading from Notion API with progress tracking
 * - Fallback to sample data when not configured
 * - Abort controller management for request cancellation
 * - Failed database tracking
 *
 * @param effectiveConfig - The merged Notion configuration to use
 * @returns Object with data loading state and methods
 *
 * @example
 * const {
 *   isUsingDemoData,
 *   loadingProgress,
 *   failedDatabases,
 *   refreshData
 * } = useNotionData(effectiveConfig);
 */
export function useNotionData(effectiveConfig: NotionConfig | null): UseNotionDataReturn {
  const { setItems, setLoading, setError, expandAll } = useStore();

  // Initialize based on config validity - if valid config exists, assume we're not using demo data
  const [isUsingDemoData, setIsUsingDemoData] = useState(
    () => !hasValidNotionConfig(effectiveConfig)
  );
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [failedDatabases, setFailedDatabases] = useState<FailedDatabase[] | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to expand all after a delay (clears existing timeout)
  const scheduleExpandAll = useCallback(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    expandTimeoutRef.current = setTimeout(() => expandAll(), 100);
  }, [expandAll]);

  // Handle progress updates during data fetch
  const handleFetchProgress = useCallback(
    (
      abortController: AbortController,
      progress: {
        loaded: number;
        total: number | null;
        items: Array<unknown>;
        done: boolean;
        failedDatabases?: Array<{ type: string; error: string }>;
      }
    ) => {
      if (abortController.signal.aborted) return;

      setLoadingProgress({ loaded: progress.loaded, total: progress.total });

      if (progress.failedDatabases?.length) {
        setFailedDatabases(progress.failedDatabases);
      }

      if (progress.items.length > 0 && !progress.done) {
        setItems(progress.items as WorkItem[]);
      }
    },
    [setItems]
  );

  // Load sample data as fallback
  const loadSampleData = useCallback(() => {
    setItems(sampleData);
    scheduleExpandAll();
  }, [setItems, scheduleExpandAll]);

  // Main data loading function
  const loadData = useCallback(
    async (config: NotionConfig | null, forceRefresh = false) => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);
      setLoadingProgress({ loaded: 0, total: null });
      setFailedDatabases(null);

      // Update demo data indicator immediately based on config validity
      const usingNotion = hasValidNotionConfig(config);
      setIsUsingDemoData(!usingNotion);

      try {
        if (usingNotion) {
          if (forceRefresh) notionService.clearCache();
          notionService.initialize(config);

          const items = await notionService.fetchAllItems({
            signal: abortController.signal,
            onProgress: progress => handleFetchProgress(abortController, progress),
          });

          if (!abortController.signal.aborted) {
            setItems(items);
            scheduleExpandAll();
          }
        } else {
          loadSampleData();
        }
      } catch (error) {
        // Don't handle aborted requests
        if (error instanceof DOMException && error.name === 'AbortError') return;

        // Only handle errors if this is still the current request
        // This prevents race conditions when config changes rapidly
        if (abortControllerRef.current !== abortController) return;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.app.error('Failed to load data from Notion:', error);
        setError(`Failed to load data from Notion: ${errorMessage}. Using demo data instead.`);
        setItems(sampleData);
        setIsUsingDemoData(true);
      } finally {
        if (abortControllerRef.current === abortController) {
          setLoading(false);
          setLoadingProgress(null);
        }
      }
    },
    [setItems, setLoading, setError, handleFetchProgress, loadSampleData, scheduleExpandAll]
  );

  // Force refresh data (bypasses cache)
  const refreshData = useCallback(async () => {
    await loadData(effectiveConfig, true);
  }, [effectiveConfig, loadData]);

  // Clear failed databases
  const clearFailedDatabases = useCallback(() => {
    setFailedDatabases(null);
  }, []);

  // Load data when config changes
  useEffect(() => {
    loadData(effectiveConfig);
  }, [effectiveConfig, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isUsingDemoData,
    loadingProgress,
    failedDatabases,
    clearFailedDatabases,
    refreshData,
    loadData,
  };
}

export default useNotionData;
