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
 * Validates that a URL is a valid Notion URL.
 * Checks that the hostname is notion.so or a subdomain of notion.so.
 *
 * @param url - The URL to validate
 * @returns True if the URL is a valid Notion URL
 *
 * @example
 * isValidNotionUrl('https://notion.so/page-123')           // true
 * isValidNotionUrl('https://www.notion.so/page-123')       // true
 * isValidNotionUrl('https://example.com/page')             // false
 * isValidNotionUrl('invalid-url')                          // false
 */
export function isValidNotionUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'notion.so' || parsed.hostname.endsWith('.notion.so');
  } catch {
    return false;
  }
}
