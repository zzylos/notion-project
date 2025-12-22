/**
 * Utility functions for array operations.
 */

/**
 * Toggles an item in an array - adds if not present, removes if present.
 *
 * This is a common pattern for filter toggles where clicking an item
 * should add it to the selection if not selected, or remove it if selected.
 *
 * @param array - The current array
 * @param item - The item to toggle
 * @returns A new array with the item toggled
 *
 * @example
 * // Add item to selection
 * const types = ['mission', 'problem'];
 * toggleArrayItem(types, 'solution'); // ['mission', 'problem', 'solution']
 *
 * // Remove item from selection
 * toggleArrayItem(types, 'problem'); // ['mission']
 */
export function toggleArrayItem<T>(array: T[], item: T): T[] {
  const index = array.indexOf(item);
  if (index === -1) {
    // Item not in array, add it
    return [...array, item];
  } else {
    // Item in array, remove it
    return array.filter((_, i) => i !== index);
  }
}

/**
 * Checks if an array includes an item (type-safe wrapper).
 *
 * @param array - The array to check
 * @param item - The item to look for
 * @returns True if the item is in the array
 */
export function includesItem<T>(array: T[], item: T): boolean {
  return array.includes(item);
}

/**
 * Removes duplicate items from an array.
 *
 * @param array - The array with potential duplicates
 * @returns A new array with unique items only
 *
 * @example
 * unique(['a', 'b', 'a', 'c']); // ['a', 'b', 'c']
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
