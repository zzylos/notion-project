/**
 * Error handling utilities for consistent error management across the application.
 *
 * Provides:
 * - Custom error classes for specific error types
 * - Error parsing and formatting utilities
 * - HTTP error code mappings for user-friendly messages
 */

import { isAbortError, getErrorMessage } from './typeGuards';

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
 * Re-export getErrorMessage from typeGuards for convenience.
 */
export { getErrorMessage };

/**
 * Re-export isAbortError from typeGuards for convenience.
 */
export { isAbortError };
