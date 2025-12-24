import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFetch } from './useFetch';

describe('useFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return getSignal, abort, and createNew functions', () => {
    const { result } = renderHook(() => useFetch());

    expect(result.current).toHaveProperty('getSignal');
    expect(result.current).toHaveProperty('abort');
    expect(result.current).toHaveProperty('createNew');
    expect(typeof result.current.getSignal).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.createNew).toBe('function');
  });

  it('should return undefined signal initially', () => {
    const { result } = renderHook(() => useFetch());

    expect(result.current.getSignal()).toBeUndefined();
  });

  it('should create a new AbortSignal', () => {
    const { result } = renderHook(() => useFetch());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.createNew();
    });

    expect(signal!).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
  });

  it('should return the same signal from getSignal after createNew', () => {
    const { result } = renderHook(() => useFetch());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.createNew();
    });

    expect(result.current.getSignal()).toBe(signal!);
  });

  it('should abort previous controller when creating new one', () => {
    const { result } = renderHook(() => useFetch());

    let firstSignal: AbortSignal;
    let secondSignal: AbortSignal;

    act(() => {
      firstSignal = result.current.createNew();
    });

    act(() => {
      secondSignal = result.current.createNew();
    });

    // First signal should be aborted
    expect(firstSignal!.aborted).toBe(true);
    // Second signal should not be aborted
    expect(secondSignal!.aborted).toBe(false);
  });

  it('should abort current request when abort is called', () => {
    const { result } = renderHook(() => useFetch());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.createNew();
    });

    expect(signal!.aborted).toBe(false);

    act(() => {
      result.current.abort();
    });

    expect(signal!.aborted).toBe(true);
  });

  it('should return undefined from getSignal after abort', () => {
    const { result } = renderHook(() => useFetch());

    act(() => {
      result.current.createNew();
    });

    act(() => {
      result.current.abort();
    });

    expect(result.current.getSignal()).toBeUndefined();
  });

  it('should abort on unmount', () => {
    const { result, unmount } = renderHook(() => useFetch());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.createNew();
    });

    expect(signal!.aborted).toBe(false);

    unmount();

    expect(signal!.aborted).toBe(true);
  });

  it('should handle multiple abort calls gracefully', () => {
    const { result } = renderHook(() => useFetch());

    act(() => {
      result.current.createNew();
    });

    // Multiple abort calls should not throw
    act(() => {
      result.current.abort();
      result.current.abort();
      result.current.abort();
    });

    expect(result.current.getSignal()).toBeUndefined();
  });

  it('should handle abort without createNew gracefully', () => {
    const { result } = renderHook(() => useFetch());

    // Abort without creating should not throw
    act(() => {
      result.current.abort();
    });

    expect(result.current.getSignal()).toBeUndefined();
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useFetch());

    const initialGetSignal = result.current.getSignal;
    const initialAbort = result.current.abort;
    const initialCreateNew = result.current.createNew;

    rerender();

    expect(result.current.getSignal).toBe(initialGetSignal);
    expect(result.current.abort).toBe(initialAbort);
    expect(result.current.createNew).toBe(initialCreateNew);
  });

  it('should work with fetch API', async () => {
    const { result } = renderHook(() => useFetch());

    // Mock fetch that checks for abort
    const mockFetch = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise((resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        setTimeout(() => resolve({ ok: true }), 100);
      });
    });

    let signal: AbortSignal;
    act(() => {
      signal = result.current.createNew();
    });

    const fetchPromise = mockFetch('/api/test', { signal: signal! });

    // Abort before fetch completes
    act(() => {
      result.current.abort();
    });

    await expect(fetchPromise).rejects.toThrow('Aborted');
  });
});
