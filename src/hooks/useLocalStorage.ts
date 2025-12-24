import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

/**
 * A hook for type-safe localStorage access with JSON serialization.
 *
 * Features:
 * - Type-safe get/set operations
 * - Automatic JSON parsing/stringifying
 * - Error handling for malformed data
 * - React state sync for reactivity
 *
 * @param key - The localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns A tuple of [value, setValue, removeValue]
 *
 * @example
 * // Store an object
 * const [settings, setSettings, removeSettings] = useLocalStorage('settings', {
 *   theme: 'light',
 *   fontSize: 14,
 * });
 *
 * // Update settings
 * setSettings({ ...settings, theme: 'dark' });
 *
 * // Clear settings
 * removeSettings();
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      logger.warn('LocalStorage', `Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  // Use ref to access current value without adding to dependencies
  // Sync ref in useEffect to comply with React Compiler rules
  const storedValueRef = useRef(storedValue);
  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  // Setter that updates both state and localStorage
  // Use functional update to get current value safely
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue(prevValue => {
          // Allow value to be a function for functional updates
          // Use typeof check instead of instanceof for more reliable function detection
          const valueToStore =
            typeof value === 'function' ? (value as (prev: T) => T)(prevValue) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        logger.warn('LocalStorage', `Error setting key "${key}":`, error);
      }
    },
    [key]
  );

  // Use ref for initialValue to avoid recreation
  // Keep ref in sync with prop changes so removeValue uses current initial value
  const initialValueRef = useRef(initialValue);
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // Remove value from localStorage and reset to initial
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValueRef.current);
    } catch (error) {
      logger.warn('LocalStorage', `Error removing key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
