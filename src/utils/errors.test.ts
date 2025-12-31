import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  NetworkError,
  ApiError,
  ValidationError,
  getHttpErrorMessage,
  shouldRetry,
  withRetry,
} from './errors';

describe('AppError', () => {
  it('should create error with message and defaults', () => {
    const error = new AppError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.recoverable).toBe(true);
    expect(error.statusCode).toBeUndefined();
  });

  it('should create error with custom options', () => {
    const error = new AppError('Test error', {
      code: 'CUSTOM_CODE',
      statusCode: 400,
      recoverable: false,
    });
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.recoverable).toBe(false);
  });
});

describe('NetworkError', () => {
  it('should create network error with correct defaults', () => {
    const error = new NetworkError('Connection failed');
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.recoverable).toBe(true);
  });
});

describe('ApiError', () => {
  it('should create API error with endpoint', () => {
    const error = new ApiError('Not found', '/api/items', { statusCode: 404 });
    expect(error.name).toBe('ApiError');
    expect(error.endpoint).toBe('/api/items');
    expect(error.statusCode).toBe(404);
  });

  it('should be recoverable for 5xx errors', () => {
    const error = new ApiError('Server error', '/api/items', { statusCode: 500 });
    expect(error.recoverable).toBe(true);
  });

  it('should not be recoverable for 4xx errors', () => {
    const error = new ApiError('Bad request', '/api/items', { statusCode: 400 });
    expect(error.recoverable).toBe(false);
  });
});

describe('ValidationError', () => {
  it('should create validation error with field', () => {
    const error = new ValidationError('Email is invalid', 'email');
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('email');
    expect(error.recoverable).toBe(false);
  });
});

describe('getHttpErrorMessage', () => {
  it('should return known error messages', () => {
    expect(getHttpErrorMessage(400)).toContain('Invalid request');
    expect(getHttpErrorMessage(401)).toContain('Authentication');
    expect(getHttpErrorMessage(403)).toContain('Access denied');
    expect(getHttpErrorMessage(404)).toContain('not found');
    expect(getHttpErrorMessage(429)).toContain('Too many requests');
    expect(getHttpErrorMessage(500)).toContain('Server error');
  });

  it('should return fallback for unknown status codes', () => {
    expect(getHttpErrorMessage(418)).toContain('status 418');
    expect(getHttpErrorMessage(418, 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('shouldRetry', () => {
  it('should return false for abort errors', () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    expect(shouldRetry(abortError)).toBe(false);
  });

  it('should return true for NetworkError', () => {
    expect(shouldRetry(new NetworkError('Failed'))).toBe(true);
  });

  it('should return true for 5xx ApiError', () => {
    expect(shouldRetry(new ApiError('Error', '/api', { statusCode: 500 }))).toBe(true);
    expect(shouldRetry(new ApiError('Error', '/api', { statusCode: 502 }))).toBe(true);
  });

  it('should return true for rate limiting (429)', () => {
    expect(shouldRetry(new ApiError('Error', '/api', { statusCode: 429 }))).toBe(true);
  });

  it('should return false for 4xx errors (except 429)', () => {
    expect(shouldRetry(new ApiError('Error', '/api', { statusCode: 400 }))).toBe(false);
    expect(shouldRetry(new ApiError('Error', '/api', { statusCode: 404 }))).toBe(false);
  });
});

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await withRetry(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, { delayMs: 10 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new NetworkError('Failed'));

    await expect(withRetry(operation, { maxRetries: 2, delayMs: 10 })).rejects.toThrow('Failed');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid'));

    await expect(withRetry(operation, { maxRetries: 3 })).rejects.toThrow('Invalid');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success');

    await withRetry(operation, { delayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
