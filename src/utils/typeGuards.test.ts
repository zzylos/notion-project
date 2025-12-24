import { describe, it, expect } from 'vitest';
import {
  isAbortError,
  isError,
  isObject,
  isNonEmptyString,
  isValidNumber,
  isNonEmptyArray,
  hasProperty,
  isNullish,
  assertDefined,
  getErrorMessage,
} from './typeGuards';

describe('isAbortError', () => {
  it('should return true for DOMException with name AbortError', () => {
    const error = new DOMException('The operation was aborted', 'AbortError');
    expect(isAbortError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isAbortError(error)).toBe(false);
  });

  it('should return false for DOMException with different name', () => {
    const error = new DOMException('Some error', 'NetworkError');
    expect(isAbortError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('string')).toBe(false);
    expect(isAbortError({})).toBe(false);
  });
});

describe('isError', () => {
  it('should return true for Error instances', () => {
    expect(isError(new Error('test'))).toBe(true);
    expect(isError(new TypeError('test'))).toBe(true);
    expect(isError(new RangeError('test'))).toBe(true);
  });

  it('should return false for non-Error values', () => {
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError('error string')).toBe(false);
    expect(isError({ message: 'error' })).toBe(false);
  });
});

describe('isObject', () => {
  it('should return true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: 'value' })).toBe(true);
  });

  it('should return true for arrays', () => {
    expect(isObject([])).toBe(true);
    expect(isObject([1, 2, 3])).toBe(true);
  });

  it('should return false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isObject(undefined)).toBe(false);
    expect(isObject('string')).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject(true)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('a')).toBe(true);
  });

  it('should return false for empty strings', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('should return false for whitespace-only strings', () => {
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('\t\n')).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(['array'])).toBe(false);
  });
});

describe('isValidNumber', () => {
  it('should return true for finite numbers', () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(42)).toBe(true);
    expect(isValidNumber(-17.5)).toBe(true);
  });

  it('should return false for NaN', () => {
    expect(isValidNumber(NaN)).toBe(false);
  });

  it('should return false for Infinity', () => {
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it('should return false for non-numbers', () => {
    expect(isValidNumber('42')).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
  });
});

describe('isNonEmptyArray', () => {
  it('should return true for non-empty arrays', () => {
    expect(isNonEmptyArray([1])).toBe(true);
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    expect(isNonEmptyArray(['a', 'b'])).toBe(true);
  });

  it('should return false for empty arrays', () => {
    expect(isNonEmptyArray([])).toBe(false);
  });

  it('should return false for non-arrays', () => {
    expect(isNonEmptyArray(null)).toBe(false);
    expect(isNonEmptyArray(undefined)).toBe(false);
    expect(isNonEmptyArray('array')).toBe(false);
    expect(isNonEmptyArray({ length: 1 })).toBe(false);
  });
});

describe('hasProperty', () => {
  it('should return true when object has the property', () => {
    expect(hasProperty({ name: 'test' }, 'name')).toBe(true);
    expect(hasProperty({ a: 1, b: 2 }, 'a')).toBe(true);
  });

  it('should return false when object lacks the property', () => {
    expect(hasProperty({}, 'name')).toBe(false);
    expect(hasProperty({ a: 1 }, 'b')).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(hasProperty(null, 'prop')).toBe(false);
    expect(hasProperty(undefined, 'prop')).toBe(false);
    expect(hasProperty('string', 'length')).toBe(false);
  });
});

describe('isNullish', () => {
  it('should return true for null and undefined', () => {
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
  });

  it('should return false for other falsy values', () => {
    expect(isNullish(0)).toBe(false);
    expect(isNullish('')).toBe(false);
    expect(isNullish(false)).toBe(false);
  });

  it('should return false for truthy values', () => {
    expect(isNullish(1)).toBe(false);
    expect(isNullish('text')).toBe(false);
    expect(isNullish({})).toBe(false);
    expect(isNullish([])).toBe(false);
  });
});

describe('assertDefined', () => {
  it('should not throw for defined values', () => {
    expect(() => assertDefined('value')).not.toThrow();
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined(false)).not.toThrow();
    expect(() => assertDefined({})).not.toThrow();
  });

  it('should throw for null', () => {
    expect(() => assertDefined(null)).toThrow('Value must be defined');
  });

  it('should throw for undefined', () => {
    expect(() => assertDefined(undefined)).toThrow('Value must be defined');
  });

  it('should use custom error message', () => {
    expect(() => assertDefined(null, 'Custom message')).toThrow('Custom message');
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error', () => {
    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
  });

  it('should return string errors as-is', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should extract message from objects with message property', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('should return fallback for unknown types', () => {
    expect(getErrorMessage(123)).toBe('Unknown error');
    expect(getErrorMessage(null)).toBe('Unknown error');
    expect(getErrorMessage(undefined)).toBe('Unknown error');
    expect(getErrorMessage({})).toBe('Unknown error');
  });

  it('should use custom fallback', () => {
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });
});
