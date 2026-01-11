import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { notionService } from '../services/notionService';
import { sampleData } from '../utils/sampleData';
import type { NotionConfig, WorkItem } from '../types';

/**
 * Check if a NotionConfig has valid credentials for connecting to Notion.
 */
function hasValidNotionConfig(config: NotionConfig | null): config is NotionConfig {
  return Boolean(
    config?.apiKey && (config.databaseId || (config.databases && config.databases.length > 0))
  );
}

/**
 * Hook for managing Notion data fetching.
 */
export function useNotionData(effectiveConfig: NotionConfig | null): void {
  const { setItems, setLoading, setError, expandAll } = useStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Main data loading function
  const loadData = useCallback(
    async (config: NotionConfig | null) => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      try {
        if (hasValidNotionConfig(config)) {
          notionService.initialize(config);

          const items = await notionService.fetchAllItems({
            signal: abortController.signal,
            onProgress: progress => {
              if (!abortController.signal.aborted && progress.items.length > 0 && !progress.done) {
                setItems(progress.items as WorkItem[]);
              }
            },
          });

          if (!abortController.signal.aborted) {
            setItems(items);
            setTimeout(() => expandAll(), 100);
          }
        } else {
          // Use sample data when not configured
          setItems(sampleData);
          setTimeout(() => expandAll(), 100);
        }
      } catch (error) {
        // Don't handle aborted requests
        if (error instanceof DOMException && error.name === 'AbortError') return;

        if (abortControllerRef.current !== abortController) return;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to load data from Notion:', error);
        setError(`Failed to load: ${errorMessage}`);
        setItems(sampleData);
      } finally {
        if (abortControllerRef.current === abortController) {
          setLoading(false);
        }
      }
    },
    [setItems, setLoading, setError, expandAll]
  );

  // Load data when config changes
  useEffect(() => {
    loadData(effectiveConfig);
  }, [effectiveConfig, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
}

export default useNotionData;
