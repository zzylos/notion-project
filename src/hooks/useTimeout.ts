import { useRef, useCallback, useEffect } from 'react';

/**
 * A hook that provides a managed timeout with automatic cleanup.
 *
 * The timeout is automatically cleared when:
 * - The component unmounts
 * - A new timeout is set (previous one is cleared)
 * - clear() is called manually
 *
 * @returns An object with set() and clear() functions
 *
 * @example
 * const timeout = useTimeout();
 *
 * // Set a timeout
 * timeout.set(() => console.log('Hello!'), 1000);
 *
 * // Clear if needed
 * timeout.clear();
 */
export function useTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const set = useCallback(
    (callback: () => void, delay: number) => {
      // Clear any existing timeout
      clear();
      // Set the new timeout
      timeoutRef.current = setTimeout(callback, delay);
    },
    [clear]
  );

  // Cleanup on unmount
  useEffect(() => {
    return clear;
  }, [clear]);

  return { set, clear };
}

export default useTimeout;
