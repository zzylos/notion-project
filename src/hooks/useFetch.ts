import { useRef, useCallback, useEffect } from 'react';

/**
 * A hook that provides an AbortController for fetch operations with automatic cleanup.
 *
 * Features:
 * - Automatically aborts in-flight requests when a new request starts
 * - Automatically aborts on component unmount
 * - Provides manual abort capability
 *
 * @returns An object with:
 *   - getSignal(): Get the AbortSignal for the current controller
 *   - abort(): Manually abort the current request
 *   - createNew(): Create a new AbortController (aborting any previous one)
 *
 * @example
 * const fetchControl = useFetch();
 *
 * const loadData = async () => {
 *   const signal = fetchControl.createNew();
 *
 *   try {
 *     const response = await fetch('/api/data', { signal });
 *     // handle response
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       // Request was cancelled, ignore
 *       return;
 *     }
 *     // Handle real error
 *   }
 * };
 */
export function useFetch() {
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const createNew = useCallback((): AbortSignal => {
    // Abort any existing request
    abort();
    // Create new controller
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, [abort]);

  const getSignal = useCallback((): AbortSignal | undefined => {
    return controllerRef.current?.signal;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return abort;
  }, [abort]);

  return { getSignal, abort, createNew };
}

export default useFetch;
