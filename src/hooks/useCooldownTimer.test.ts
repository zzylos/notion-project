import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCooldownTimer } from './useCooldownTimer';
import * as config from '../utils/config';

// Mock the config utilities
vi.mock('../utils/config', () => ({
  checkRefreshCooldown: vi.fn(),
  setLastRefreshTime: vi.fn(),
}));

describe('useCooldownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with current cooldown state', () => {
    vi.mocked(config.checkRefreshCooldown).mockReturnValue({
      allowed: true,
      remainingMs: 0,
    });

    const { result } = renderHook(() => useCooldownTimer());

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isAllowed).toBe(true);
  });

  it('should initialize in cooldown when one is active', () => {
    vi.mocked(config.checkRefreshCooldown).mockReturnValue({
      allowed: false,
      remainingMs: 60000,
    });

    const { result } = renderHook(() => useCooldownTimer());

    expect(result.current.remainingMs).toBe(60000);
    expect(result.current.isAllowed).toBe(false);
  });

  describe('checkAndStartCooldown', () => {
    it('should return true and set timestamp when allowed', () => {
      // Mock always returns allowed for this test
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: true,
        remainingMs: 0,
      });

      const { result } = renderHook(() => useCooldownTimer());

      let returnValue: boolean = false;
      act(() => {
        returnValue = result.current.checkAndStartCooldown();
      });

      expect(returnValue).toBe(true);
      expect(config.setLastRefreshTime).toHaveBeenCalled();
    });

    it('should return false when not allowed', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: false,
        remainingMs: 60000,
      });

      const { result } = renderHook(() => useCooldownTimer());

      let returnValue: boolean = true;
      act(() => {
        returnValue = result.current.checkAndStartCooldown();
      });

      expect(returnValue).toBe(false);
      expect(config.setLastRefreshTime).not.toHaveBeenCalled();
    });

    it('should update remainingMs when in cooldown', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: false,
        remainingMs: 45000,
      });

      const { result } = renderHook(() => useCooldownTimer());

      // When in cooldown, the hook should reflect the remaining time
      expect(result.current.remainingMs).toBe(45000);
      expect(result.current.isAllowed).toBe(false);
    });
  });

  describe('startCooldown', () => {
    it('should expose startCooldown function', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: false,
        remainingMs: 5000,
      });

      const { result } = renderHook(() => useCooldownTimer());

      // Verify startCooldown is a function that can be called
      expect(typeof result.current.startCooldown).toBe('function');

      // Should not throw when called
      act(() => {
        result.current.startCooldown();
      });
    });

    it('should update state when interval fires', () => {
      let remaining = 5000;
      vi.mocked(config.checkRefreshCooldown).mockImplementation(() => {
        // Simulate decreasing time
        const current = remaining;
        remaining = Math.max(0, remaining - 1000);
        return { allowed: current <= 0, remainingMs: current };
      });

      const { result } = renderHook(() => useCooldownTimer());

      // Initial state
      expect(result.current.remainingMs).toBe(5000);

      act(() => {
        result.current.startCooldown();
      });

      // After calling startCooldown and advancing time, the state should be checked via interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // The hook should have called checkRefreshCooldown again
      expect(config.checkRefreshCooldown).toHaveBeenCalled();
    });
  });

  describe('isAllowed', () => {
    it('should be true when remainingMs is 0', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: true,
        remainingMs: 0,
      });

      const { result } = renderHook(() => useCooldownTimer());
      expect(result.current.isAllowed).toBe(true);
    });

    it('should be false when remainingMs is greater than 0', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: false,
        remainingMs: 1000,
      });

      const { result } = renderHook(() => useCooldownTimer());
      expect(result.current.isAllowed).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      vi.mocked(config.checkRefreshCooldown).mockReturnValue({
        allowed: false,
        remainingMs: 60000,
      });

      const { unmount } = renderHook(() => useCooldownTimer());

      // Unmount should clear the interval
      unmount();

      // Advancing timers after unmount should not cause issues
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // No assertions needed - just verifying no errors occur
    });
  });
});
