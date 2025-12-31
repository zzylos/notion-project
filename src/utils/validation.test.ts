import { describe, it, expect } from 'vitest';
import {
  isValidDatabaseId,
  isValidNotionUrl,
  validateApiKey,
  validateNotionConfig,
} from './validation';

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

// Helper to create a valid API key of specified length
const makeApiKey = (length: number): string => {
  const prefix = 'secret_';
  const remaining = length - prefix.length;
  return prefix + 'a'.repeat(Math.max(0, remaining));
};

describe('validateApiKey', () => {
  it('should return valid: true for valid API keys', () => {
    expect(validateApiKey(makeApiKey(50))).toEqual({ valid: true });
  });

  it('should return specific error for missing API key', () => {
    expect(validateApiKey('')).toEqual({
      valid: false,
      error: 'API key is required',
    });
  });

  it('should return specific error for wrong prefix', () => {
    expect(validateApiKey('wrong_' + 'a'.repeat(50))).toEqual({
      valid: false,
      error: 'API key must start with "secret_"',
    });
  });

  it('should return specific error for short key', () => {
    const result = validateApiKey('secret_short');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should return specific error for long key', () => {
    const result = validateApiKey(makeApiKey(250));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });
});

describe('validateNotionConfig', () => {
  it('should return valid: true for valid config', () => {
    const result = validateNotionConfig({
      apiKey: makeApiKey(50),
      databases: [{ databaseId: '12345678123412341234123456789abc', type: 'project' }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error for missing API key', () => {
    const result = validateNotionConfig({
      apiKey: '',
      databases: [{ databaseId: '12345678123412341234123456789abc', type: 'project' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'apiKey')).toBe(true);
  });

  it('should return error for missing databases', () => {
    const result = validateNotionConfig({
      apiKey: makeApiKey(50),
      databases: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'databases')).toBe(true);
  });

  it('should return error for invalid database ID', () => {
    const result = validateNotionConfig({
      apiKey: makeApiKey(50),
      databases: [{ databaseId: 'invalid', type: 'project' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('databaseId'))).toBe(true);
  });

  it('should return error for missing database type', () => {
    const result = validateNotionConfig({
      apiKey: makeApiKey(50),
      databases: [{ databaseId: '12345678123412341234123456789abc', type: '' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('type'))).toBe(true);
  });
});
