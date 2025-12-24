import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value when localStorage has data', () => {
    mockLocalStorage.setItem('testKey', JSON.stringify('stored'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    expect(result.current[0]).toBe('stored');
  });

  it('should update value and localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('updated'));
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it('should remove value from localStorage when removeValue is called', () => {
    mockLocalStorage.setItem('testKey', JSON.stringify('stored'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    expect(result.current[0]).toBe('stored');

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('initial');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
  });

  it('should handle objects', () => {
    const initialValue = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('testKey', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    act(() => {
      result.current[1]({ name: 'updated', count: 5 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
  });

  it('should handle arrays', () => {
    const initialValue = ['a', 'b', 'c'];
    const { result } = renderHook(() => useLocalStorage('testKey', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    act(() => {
      result.current[1](['x', 'y']);
    });

    expect(result.current[0]).toEqual(['x', 'y']);
  });

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('testKey', null));

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]('value');
    });

    expect(result.current[0]).toBe('value');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });

  it('should return initial value on JSON parse error', () => {
    mockLocalStorage.setItem('testKey', 'invalid json {');

    const { result } = renderHook(() => useLocalStorage('testKey', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('should maintain stable function references across rerenders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('testKey', 'initial'));

    const [, setValue1, removeValue1] = result.current;

    rerender();

    const [, setValue2, removeValue2] = result.current;

    expect(setValue1).toBe(setValue2);
    expect(removeValue1).toBe(removeValue2);
  });

  it('should update localStorage correctly with complex nested objects', () => {
    const complexValue = {
      user: { name: 'Test', email: 'test@example.com' },
      settings: { theme: 'dark', notifications: true },
      items: [1, 2, 3],
    };

    const { result } = renderHook(() =>
      useLocalStorage('complex', { user: {}, settings: {}, items: [] })
    );

    act(() => {
      result.current[1](complexValue);
    });

    expect(result.current[0]).toEqual(complexValue);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('complex', JSON.stringify(complexValue));
  });

  it('should work with different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');

    act(() => {
      result1.current[1]('updated1');
    });

    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('value2');
  });

  it('should preserve value through rerender with same key', () => {
    const { result, rerender } = renderHook(({ key }) => useLocalStorage(key, 'initial'), {
      initialProps: { key: 'testKey' },
    });

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');

    rerender({ key: 'testKey' });

    expect(result.current[0]).toBe('updated');
  });
});
