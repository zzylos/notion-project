import { describe, it, expect } from 'vitest';
import { AppError, NetworkError, ApiError, ValidationError, getHttpErrorMessage } from './errors';

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
