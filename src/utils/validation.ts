/**
 * Validation utilities for the application.
 */

/**
 * Validates a Notion database ID format.
 * Accepts UUIDs with or without hyphens.
 *
 * @param id - The database ID to validate
 * @returns True if the ID is valid or empty, false otherwise
 *
 * @example
 * isValidDatabaseId('abc123...-...-...-...-...')  // true
 * isValidDatabaseId('abc123def456...')            // true (32 chars)
 * isValidDatabaseId('')                           // true (empty is valid - optional field)
 * isValidDatabaseId('invalid')                    // false
 */
export function isValidDatabaseId(id: string): boolean {
  if (!id.trim()) return true; // Empty is valid (optional field)
  const trimmed = id.trim();
  // UUID with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidWithHyphens = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // UUID without hyphens: 32 hex characters
  const uuidWithoutHyphens = /^[0-9a-f]{32}$/i;
  return uuidWithHyphens.test(trimmed) || uuidWithoutHyphens.test(trimmed);
}

/**
 * Validates an email address format.
 *
 * @param email - The email to validate
 * @returns True if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
