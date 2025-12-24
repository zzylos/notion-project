import { describe, it, expect } from 'vitest';
import {
  isValidDatabaseId,
  isValidEmail,
  isValidNotionUrl,
  isValidApiKey,
  validateApiKey,
  required,
  minLength,
  maxLength,
  pattern,
  batchValidate,
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

describe('isValidEmail', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.org')).toBe(true);
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('user domain.com')).toBe(false);
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

describe('isValidApiKey', () => {
  it('should accept valid API keys with proper length', () => {
    // Notion API keys are typically 50+ characters
    expect(isValidApiKey(makeApiKey(50))).toBe(true);
    expect(isValidApiKey(makeApiKey(100))).toBe(true);
  });

  it('should reject API keys without secret_ prefix', () => {
    expect(isValidApiKey('abc123xyz'.repeat(10))).toBe(false);
    expect(isValidApiKey('SECRET_' + 'a'.repeat(50))).toBe(false); // Case sensitive
  });

  it('should reject API keys that are too short', () => {
    expect(isValidApiKey('secret_')).toBe(false); // Only 7 chars
    expect(isValidApiKey('secret_abc')).toBe(false); // Only 10 chars
    expect(isValidApiKey(makeApiKey(49))).toBe(false); // Just under limit
  });

  it('should reject API keys that are too long', () => {
    expect(isValidApiKey(makeApiKey(201))).toBe(false);
    expect(isValidApiKey(makeApiKey(500))).toBe(false);
  });

  it('should reject empty or whitespace-only values', () => {
    expect(isValidApiKey('')).toBe(false);
    expect(isValidApiKey('   ')).toBe(false);
  });

  it('should handle leading/trailing whitespace', () => {
    expect(isValidApiKey('  ' + makeApiKey(50) + '  ')).toBe(true);
  });
});

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

describe('validators', () => {
  describe('required', () => {
    it('should return null for non-empty values', () => {
      const validator = required();
      expect(validator('hello', 'name')).toBeNull();
    });

    it('should return error for empty values', () => {
      const validator = required();
      expect(validator('', 'name')).toEqual({
        field: 'name',
        message: 'This field is required',
      });
    });

    it('should support custom error message', () => {
      const validator = required('Custom message');
      expect(validator('', 'name')).toEqual({
        field: 'name',
        message: 'Custom message',
      });
    });
  });

  describe('minLength', () => {
    it('should return null for values meeting minimum', () => {
      const validator = minLength(5);
      expect(validator('hello', 'name')).toBeNull();
      expect(validator('hi there', 'name')).toBeNull();
    });

    it('should return error for short values', () => {
      const validator = minLength(5);
      expect(validator('hi', 'name')).toEqual({
        field: 'name',
        message: 'Must be at least 5 characters',
      });
    });

    it('should support custom message', () => {
      const validator = minLength(5, 'Too short!');
      expect(validator('hi', 'name')).toEqual({
        field: 'name',
        message: 'Too short!',
      });
    });
  });

  describe('maxLength', () => {
    it('should return null for values under maximum', () => {
      const validator = maxLength(10);
      expect(validator('hello', 'name')).toBeNull();
    });

    it('should return error for long values', () => {
      const validator = maxLength(5);
      expect(validator('hello world', 'name')).toEqual({
        field: 'name',
        message: 'Must be no more than 5 characters',
      });
    });
  });

  describe('pattern', () => {
    it('should return null for matching values', () => {
      const validator = pattern(/^[a-z]+$/, 'Must be lowercase');
      expect(validator('hello', 'name')).toBeNull();
    });

    it('should return error for non-matching values', () => {
      const validator = pattern(/^[a-z]+$/, 'Must be lowercase');
      expect(validator('HELLO', 'name')).toEqual({
        field: 'name',
        message: 'Must be lowercase',
      });
    });
  });
});

describe('batchValidate', () => {
  it('should return valid: true when all validations pass', () => {
    const result = batchValidate({
      name: ['John', [required()]],
      email: ['test@example.com', [required()]],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors from failed validations', () => {
    const result = batchValidate({
      name: ['', [required()]],
      email: ['', [required()]],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should stop at first error per field', () => {
    const result = batchValidate({
      name: ['', [required(), minLength(5)]],
    });
    // Should only have the required error, not minLength
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('This field is required');
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
