/**
 * Validation utilities for the application.
 */

/**
 * Validation result with field information.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error.
 */
export interface ValidationError {
  field: string;
  message: string;
}

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
 * Validates an email address format.
 *
 * @param email - The email to validate
 * @returns True if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

/**
 * Notion API key constraints
 */
const API_KEY_CONSTRAINTS = {
  MIN_LENGTH: 50, // Notion API keys are typically ~50+ chars
  MAX_LENGTH: 200, // Reasonable upper bound
  PREFIX: 'secret_',
} as const;

/**
 * Validates a Notion API key format.
 * Notion API keys should start with 'secret_' prefix and have reasonable length.
 *
 * @param apiKey - The API key to validate
 * @returns True if the API key format is valid
 *
 * @example
 * isValidApiKey('secret_abc123...')  // true (if length >= 50)
 * isValidApiKey('abc123...')          // false (no prefix)
 * isValidApiKey('')                   // false
 * isValidApiKey('secret_x')           // false (too short)
 */
export function isValidApiKey(apiKey: string): boolean {
  if (!apiKey || !apiKey.trim()) return false;
  const trimmed = apiKey.trim();

  // Must start with secret_ prefix
  if (!trimmed.startsWith(API_KEY_CONSTRAINTS.PREFIX)) return false;

  // Must have reasonable length
  if (trimmed.length < API_KEY_CONSTRAINTS.MIN_LENGTH) return false;
  if (trimmed.length > API_KEY_CONSTRAINTS.MAX_LENGTH) return false;

  return true;
}

/**
 * Validates API key with detailed error message.
 *
 * @param apiKey - The API key to validate
 * @returns Object with valid status and optional error message
 *
 * @example
 * validateApiKey('secret_abc123...')  // { valid: true }
 * validateApiKey('abc')               // { valid: false, error: 'API key must start with "secret_"' }
 */
export function validateApiKey(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'API key is required' };
  }

  const trimmed = apiKey.trim();

  if (!trimmed.startsWith(API_KEY_CONSTRAINTS.PREFIX)) {
    return { valid: false, error: 'API key must start with "secret_"' };
  }

  if (trimmed.length < API_KEY_CONSTRAINTS.MIN_LENGTH) {
    return {
      valid: false,
      error: `API key is too short (minimum ${API_KEY_CONSTRAINTS.MIN_LENGTH} characters)`,
    };
  }

  if (trimmed.length > API_KEY_CONSTRAINTS.MAX_LENGTH) {
    return {
      valid: false,
      error: `API key is too long (maximum ${API_KEY_CONSTRAINTS.MAX_LENGTH} characters)`,
    };
  }

  return { valid: true };
}

/**
 * Validator function type for batch validation.
 */
export type Validator<T> = (value: T, field: string) => ValidationError | null;

/**
 * Creates a validator that checks for non-empty strings.
 *
 * @param message - Custom error message
 * @returns Validator function
 */
export function required(message = 'This field is required'): Validator<string> {
  return (value: string, field: string) => {
    if (!value || !value.trim()) {
      return { field, message };
    }
    return null;
  };
}

/**
 * Creates a validator that checks minimum length.
 *
 * @param minLength - Minimum length
 * @param message - Custom error message
 * @returns Validator function
 */
export function minLength(minLength: number, message?: string): Validator<string> {
  return (value: string, field: string) => {
    if (value && value.trim().length < minLength) {
      return {
        field,
        message: message || `Must be at least ${minLength} characters`,
      };
    }
    return null;
  };
}

/**
 * Creates a validator that checks maximum length.
 *
 * @param maxLength - Maximum length
 * @param message - Custom error message
 * @returns Validator function
 */
export function maxLength(maxLength: number, message?: string): Validator<string> {
  return (value: string, field: string) => {
    if (value && value.trim().length > maxLength) {
      return {
        field,
        message: message || `Must be no more than ${maxLength} characters`,
      };
    }
    return null;
  };
}

/**
 * Creates a validator that matches a pattern.
 *
 * @param pattern - RegExp pattern to match
 * @param message - Error message for invalid values
 * @returns Validator function
 */
export function pattern(pattern: RegExp, message: string): Validator<string> {
  return (value: string, field: string) => {
    if (value && !pattern.test(value.trim())) {
      return { field, message };
    }
    return null;
  };
}

/**
 * Batch validate multiple fields with multiple validators.
 *
 * @param validations - Object mapping field names to [value, validators] tuples
 * @returns ValidationResult with all errors collected
 *
 * @example
 * const result = batchValidate({
 *   apiKey: ['secret_abc', [required(), minLength(50)]],
 *   databaseId: ['abc123', [required(), pattern(/^[a-f0-9]{32}$/i, 'Invalid ID')]],
 * });
 *
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */
export function batchValidate<T extends string = string>(
  validations: Record<string, [T, Validator<T>[]]>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, [value, validators]] of Object.entries(validations)) {
    for (const validator of validators) {
      const error = validator(value, field);
      if (error) {
        errors.push(error);
        break; // Stop at first error for this field
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Notion configuration.
 *
 * @param config - Configuration object to validate
 * @returns ValidationResult with all errors
 *
 * @example
 * const result = validateNotionConfig({
 *   apiKey: 'secret_abc...',
 *   databases: [{ databaseId: 'abc123', type: 'project' }],
 * });
 */
export function validateNotionConfig(config: {
  apiKey?: string;
  databases?: Array<{ databaseId?: string; type?: string }>;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate API key
  const apiKeyValidation = validateApiKey(config.apiKey || '');
  if (!apiKeyValidation.valid) {
    errors.push({
      field: 'apiKey',
      message: apiKeyValidation.error || 'Invalid API key',
    });
  }

  // Validate databases
  if (!config.databases || config.databases.length === 0) {
    errors.push({
      field: 'databases',
      message: 'At least one database must be configured',
    });
  } else {
    config.databases.forEach((db, index) => {
      if (!db.databaseId) {
        errors.push({
          field: `databases[${index}].databaseId`,
          message: 'Database ID is required',
        });
      } else if (!isValidDatabaseId(db.databaseId)) {
        errors.push({
          field: `databases[${index}].databaseId`,
          message: 'Invalid database ID format',
        });
      }

      if (!db.type) {
        errors.push({
          field: `databases[${index}].type`,
          message: 'Database type is required',
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
