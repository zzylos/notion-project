import { describe, it, expect } from 'vitest';
import { isValidDatabaseId, isValidNotionUrl } from './validation';

describe('isValidDatabaseId', () => {
  it('should accept valid UUID with hyphens', () => {
    expect(isValidDatabaseId('12345678-1234-1234-1234-123456789abc')).toBe(true);
    expect(isValidDatabaseId('ABCDEF12-3456-7890-ABCD-EF1234567890')).toBe(true);
  });

  it('should accept valid UUID without hyphens (32 hex chars)', () => {
    expect(isValidDatabaseId('12345678123412341234123456789abc')).toBe(true);
    expect(isValidDatabaseId('abcdef1234567890abcdef1234567890')).toBe(true);
  });

  it('should accept empty string (optional field)', () => {
    expect(isValidDatabaseId('')).toBe(true);
    expect(isValidDatabaseId('   ')).toBe(true);
  });

  it('should reject invalid IDs', () => {
    expect(isValidDatabaseId('invalid')).toBe(false);
    expect(isValidDatabaseId('12345')).toBe(false);
    expect(isValidDatabaseId('not-a-valid-uuid-format-here')).toBe(false);
    // Wrong length
    expect(isValidDatabaseId('1234567812341234123412345678')).toBe(false);
    // Invalid characters
    expect(isValidDatabaseId('1234567g-1234-1234-1234-123456789abc')).toBe(false);
  });
});

describe('isValidNotionUrl', () => {
  it('should accept valid Notion URLs', () => {
    expect(isValidNotionUrl('https://notion.so/page-123')).toBe(true);
    expect(isValidNotionUrl('https://www.notion.so/workspace/page')).toBe(true);
    expect(isValidNotionUrl('https://acme.notion.so/My-Page-abc123')).toBe(true);
  });

  it('should reject non-Notion URLs', () => {
    expect(isValidNotionUrl('https://example.com/page')).toBe(false);
    expect(isValidNotionUrl('https://google.com')).toBe(false);
    expect(isValidNotionUrl('https://notion.com/page')).toBe(false); // Wrong TLD
  });

  it('should reject invalid URLs', () => {
    expect(isValidNotionUrl('')).toBe(false);
    expect(isValidNotionUrl('not-a-url')).toBe(false);
    expect(isValidNotionUrl('notion.so/page')).toBe(false); // No protocol
  });
});
