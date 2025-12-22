import { useRef, useCallback } from 'react';

/**
 * A hook that tracks when a data key changes, useful for detecting
 * when underlying data has changed and needs to trigger a re-render or re-calculation.
 *
 * This pattern is commonly used in React Flow and canvas components to avoid
 * infinite update loops while still responding to data changes.
 *
 * @returns An object with:
 *   - hasChanged(key: string): Check if the key differs from the previous one
 *   - getKey(): Get the current stored key
 *
 * @example
 * const dataTracker = useDataChanged();
 *
 * // Create a key from your data
 * const dataKey = items.map(i => i.id).sort().join(',');
 *
 * // Check if data changed
 * if (dataTracker.hasChanged(dataKey)) {
 *   // Trigger re-layout or other expensive operation
 *   recalculateLayout();
 * }
 */
export function useDataChanged() {
  const prevKeyRef = useRef<string | null>(null);

  const hasChanged = useCallback((key: string): boolean => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      return true;
    }
    return false;
  }, []);

  const getKey = useCallback((): string | null => {
    return prevKeyRef.current;
  }, []);

  return { hasChanged, getKey };
}

export default useDataChanged;
