/**
 * Tests for shared parseNotionError utility.
 */

import { describe, it, expect } from 'vitest';
import { parseNotionError } from '../../shared';

describe('parseNotionError', () => {
  describe('authentication errors', () => {
    it('should return user-friendly message for 401 unauthorized', () => {
      const result = parseNotionError(401, '{"code":"unauthorized"}');
      expect(result).toBe('Invalid API key. Please check your Notion integration token.');
    });

    it('should return user-friendly message for 403 forbidden', () => {
      const result = parseNotionError(403, '{"code":"forbidden"}');
      expect(result).toBe(
        'Access denied. Make sure you have shared the database with your integration.'
      );
    });
  });

  describe('resource errors', () => {
    it('should return user-friendly message for 404 not found', () => {
      const result = parseNotionError(404, '{}');
      expect(result).toBe(
        'Database not found. Please verify the database ID and ensure it is shared with your integration.'
      );
    });
  });

  describe('rate limiting', () => {
    it('should return user-friendly message for 429 rate limited', () => {
      const result = parseNotionError(429, '{}');
      expect(result).toBe('Rate limited by Notion API. Please wait a moment and try again.');
    });
  });

  describe('validation errors', () => {
    it('should include message for 400 validation_error', () => {
      const result = parseNotionError(
        400,
        '{"code":"validation_error","message":"Invalid property format"}'
      );
      expect(result).toBe('Invalid request: Invalid property format');
    });

    it('should return generic message for 400 without validation_error code', () => {
      const result = parseNotionError(400, '{"message":"Something went wrong"}');
      expect(result).toBe('Bad request: Something went wrong');
    });

    it('should return fallback message for 400 with empty message', () => {
      const result = parseNotionError(400, '{}');
      expect(result).toBe('Bad request: Please check your configuration.');
    });
  });

  describe('server errors', () => {
    it('should return user-friendly message for 500 internal server error', () => {
      const result = parseNotionError(500, '{}');
      expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
    });

    it('should return user-friendly message for 502 bad gateway', () => {
      const result = parseNotionError(502, '{}');
      expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
    });

    it('should return user-friendly message for 503 service unavailable', () => {
      const result = parseNotionError(503, '{}');
      expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
    });
  });

  describe('unknown errors', () => {
    it('should include status code and message for unknown status', () => {
      const result = parseNotionError(418, '{"message":"I am a teapot"}');
      expect(result).toBe('Notion API error (418): I am a teapot');
    });

    it('should show "Unknown error" for unknown status without message', () => {
      const result = parseNotionError(418, '{}');
      expect(result).toBe('Notion API error (418): Unknown error');
    });
  });

  describe('malformed JSON handling', () => {
    it('should handle non-JSON error text gracefully', () => {
      const result = parseNotionError(500, 'Internal Server Error');
      expect(result).toBe('Notion API is temporarily unavailable. Please try again later.');
    });

    it('should use raw text as message for unknown status with non-JSON', () => {
      const result = parseNotionError(418, 'Custom error message');
      expect(result).toBe('Notion API error (418): Custom error message');
    });

    it('should handle empty error text', () => {
      const result = parseNotionError(418, '');
      expect(result).toBe('Notion API error (418): Unknown error');
    });
  });
});
