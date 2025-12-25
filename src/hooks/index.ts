/**
 * Custom React hooks for the Notion Opportunity Tree Visualizer.
 *
 * These hooks encapsulate common patterns used throughout the application,
 * promoting code reuse and consistent behavior.
 */

export { useFetch } from './useFetch';
export { useLocalStorage } from './useLocalStorage';
export { useItemLimit } from './useItemLimit';
export { useNotionData } from './useNotionData';
export type { LoadingProgress, FailedDatabase, UseNotionDataReturn } from './useNotionData';
export { useCooldownTimer } from './useCooldownTimer';
export type { UseCooldownTimerReturn } from './useCooldownTimer';
export { useFilterToggle } from './useFilterToggle';
export type { UseFilterToggleReturn } from './useFilterToggle';
export {
  useFilteredItems,
  useTreeNodes,
  useStats,
  useFilterOptions,
  useItemCountsByType,
  useItem,
  useItemPath,
} from './useStoreSelectors';
export { useFullscreen } from './useFullscreen';
export type { UseFullscreenReturn } from './useFullscreen';
