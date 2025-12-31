/**
 * Type guard utilities for common patterns in the application.
 *
 * These utilities provide type-safe runtime checks for various conditions,
 * reducing code duplication and improving type safety.
 */

/**
 * Checks if an error is an AbortError (from AbortController).
 * Used to distinguish user-initiated cancellations from actual errors.
 *
 * @param error - The error to check
 * @returns True if the error is an AbortError
 *
 * @example
 * try {
 *   await fetch(url, { signal });
 * } catch (error) {
 *   if (isAbortError(error)) return; // User cancelled
 *   throw error;
 * }
 */
export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Checks if a value is an Error instance.
 *
 * @param value - The value to check
 * @returns True if the value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Checks if a value is a non-null object.
 *
 * @param value - The value to check
 * @returns True if the value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks if a value is a non-empty string.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a valid number (not NaN and not Infinity).
 *
 * @param value - The value to check
 * @returns True if the value is a valid finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks if a value is an array with at least one element.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Checks if an object has a specific property.
 * Narrows the type to include that property.
 *
 * @param obj - The object to check
 * @param prop - The property name to check for
 * @returns True if the object has the property
 *
 * @example
 * if (hasProperty(response, 'error')) {
 *   console.error(response.error);
 * }
 */
export function hasProperty<K extends string>(obj: unknown, prop: K): obj is Record<K, unknown> {
  return isObject(obj) && prop in obj;
}

/**
 * Checks if a value is undefined or null.
 *
 * @param value - The value to check
 * @returns True if the value is undefined or null
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Asserts that a condition is true, throwing an error if not.
 * Useful for narrowing types in code paths that should never be reached.
 *
 * @param condition - The condition to assert
 * @param message - Error message if assertion fails
 * @throws Error if condition is false
 *
 * @example
 * function processItem(item: WorkItem | null) {
 *   assertDefined(item, 'Item must be defined');
 *   // TypeScript now knows item is WorkItem
 * }
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value must be defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Extracts an error message from an unknown error value.
 * Handles Error objects, strings, and objects with a message property.
 *
 * @param error - The error value
 * @param fallback - Fallback message if extraction fails
 * @returns The extracted error message
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   showToast(getErrorMessage(error, 'Operation failed'));
 * }
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (hasProperty(error, 'message') && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}
