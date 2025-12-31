/**
 * Error handling utilities for consistent error management across the application.
 *
 * Provides:
 * - Custom error classes for specific error types
 * - Error parsing and formatting utilities
 * - HTTP error code mappings for user-friendly messages
 */

import { isAbortError, getErrorMessage as extractErrorMessage } from './typeGuards';

/**
 * Base class for application-specific errors.
 * Extends Error with additional properties for better error handling.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly recoverable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode;
    this.recoverable = options.recoverable ?? true;
  }
}

/**
 * Error class for network-related errors.
 */
export class NetworkError extends AppError {
  constructor(message: string, options?: { cause?: Error; statusCode?: number }) {
    super(message, {
      code: 'NETWORK_ERROR',
      recoverable: true,
      ...options,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Error class for API-related errors.
 */
export class ApiError extends AppError {
  readonly endpoint: string;

  constructor(
    message: string,
    endpoint: string,
    options?: { statusCode?: number; code?: string; cause?: Error }
  ) {
    super(message, {
      code: options?.code || 'API_ERROR',
      statusCode: options?.statusCode,
      recoverable: options?.statusCode ? options.statusCode >= 500 : true,
      cause: options?.cause,
    });
    this.name = 'ApiError';
    this.endpoint = endpoint;
  }
}

/**
 * Error class for validation errors.
 */
export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, {
      code: 'VALIDATION_ERROR',
      recoverable: false,
    });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Map of HTTP status codes to user-friendly messages.
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please check your credentials.',
  403: 'Access denied. You do not have permission to access this resource.',
  404: 'Resource not found. Please check the URL or ID.',
  408: 'Request timed out. Please try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Request timed out. Please try again later.',
};

/**
 * Get a user-friendly error message for an HTTP status code.
 *
 * @param statusCode - The HTTP status code
 * @param fallback - Optional fallback message
 * @returns User-friendly error message
 */
export function getHttpErrorMessage(statusCode: number, fallback?: string): string {
  return HTTP_ERROR_MESSAGES[statusCode] || fallback || `Request failed with status ${statusCode}`;
}

/**
 * Parse an error from an API response.
 * Attempts to extract error details from JSON response body.
 *
 * @param status - HTTP status code
 * @param responseText - Raw response text
 * @returns Parsed error details
 */
export function parseApiError(
  status: number,
  responseText: string
): { code: string; message: string } {
  try {
    const parsed = JSON.parse(responseText);
    return {
      code: parsed.code || parsed.error || 'UNKNOWN',
      message: parsed.message || parsed.error_description || getHttpErrorMessage(status),
    };
  } catch {
    return {
      code: 'PARSE_ERROR',
      message: responseText || getHttpErrorMessage(status),
    };
  }
}

/**
 * Check if an error should trigger a retry.
 * Returns true for network errors and 5xx status codes.
 *
 * @param error - The error to check
 * @returns True if the operation should be retried
 */
export function shouldRetry(error: unknown): boolean {
  if (isAbortError(error)) {
    return false; // User cancelled, don't retry
  }

  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof ApiError) {
    const status = error.statusCode;
    // Retry on 5xx errors or rate limiting
    return status !== undefined && (status >= 500 || status === 429);
  }

  // Retry on generic network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Wrap an async operation with retry logic.
 *
 * @param operation - The async operation to wrap
 * @param options - Retry options
 * @returns Result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = 2, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw lastError;
      }

      const delay = delayMs * Math.pow(backoff, attempt);
      onRetry?.(attempt + 1, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Format an error for display to the user.
 * Provides a consistent format for error messages.
 *
 * @param error - The error to format
 * @param context - Optional context about where the error occurred
 * @returns Formatted error message
 */
export function formatErrorForDisplay(error: unknown, context?: string): string {
  const message = extractErrorMessage(error, 'An unexpected error occurred');
  return context ? `${context}: ${message}` : message;
}

/**
 * Re-export getErrorMessage from typeGuards for convenience.
 */
export { extractErrorMessage as getErrorMessage };

/**
 * Re-export isAbortError from typeGuards for convenience.
 */
export { isAbortError };
