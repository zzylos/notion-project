import { useState, useCallback } from 'react';

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
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter that updates both state and localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function for functional updates
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage and reset to initial
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
