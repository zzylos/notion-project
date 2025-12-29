import { logger } from './logger.js';

/**
 * Normalize a Notion UUID to consistent format (with dashes).
 *
 * Notion sometimes returns IDs with or without dashes depending on context.
 * This function ensures all UUIDs have the standard format: 8-4-4-4-12
 *
 * @param id - The UUID to normalize (with or without dashes)
 * @returns The normalized UUID with dashes, or empty string if invalid
 *
 * @example
 * normalizeUuid('12345678123412341234123456789abc') // '12345678-1234-1234-1234-123456789abc'
 * normalizeUuid('12345678-1234-1234-1234-123456789abc') // '12345678-1234-1234-1234-123456789abc'
 */
export function normalizeUuid(id: string): string {
  // Validate input
  if (!id || typeof id !== 'string') {
    logger.store.warn('normalizeUuid received invalid input:', typeof id);
    return '';
  }

  // Remove any existing dashes and convert to lowercase
  const clean = id.replace(/-/g, '').toLowerCase();

  // If it's not a valid UUID length, log warning and return as-is
  if (clean.length !== 32) {
    logger.store.warn(`Invalid UUID length (${clean.length} chars, expected 32): ${id}`);
    return id;
  }

  // Validate that it only contains valid hex characters
  if (!/^[0-9a-f]+$/.test(clean)) {
    logger.store.warn(`Invalid UUID format (non-hex characters): ${id}`);
    return id;
  }

  // Insert dashes in standard UUID positions: 8-4-4-4-12
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}
