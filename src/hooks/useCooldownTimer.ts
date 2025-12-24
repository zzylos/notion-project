import { useCallback, useRef, useEffect, useState } from 'react';
import { checkRefreshCooldown, setLastRefreshTime } from '../utils/config';

/**
 * Return type for the useCooldownTimer hook.
 */
export interface UseCooldownTimerReturn {
  /** Remaining cooldown time in milliseconds */
  remainingMs: number;
  /** Whether an action is allowed (cooldown has expired) */
  isAllowed: boolean;
  /** Start/restart the cooldown timer */
  startCooldown: () => void;
  /** Check if action is allowed and start cooldown if not */
  checkAndStartCooldown: () => boolean;
}

/**
 * Hook for managing a cooldown timer for rate-limited actions.
 *
 * This hook is useful for preventing rapid repeated actions like
 * refresh buttons. It persists across page reloads via localStorage.
 *
 * @returns Object with cooldown state and methods
 *
 * @example
 * const { remainingMs, isAllowed, checkAndStartCooldown } = useCooldownTimer();
 *
 * const handleRefresh = async () => {
 *   if (!checkAndStartCooldown()) {
 *     return; // Still in cooldown
 *   }
 *   await refreshData();
 * };
 */
export function useCooldownTimer(): UseCooldownTimerReturn {
  // Initialize with current cooldown value to avoid synchronous setState in effect
  const [remainingMs, setRemainingMs] = useState(() => checkRefreshCooldown().remainingMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any existing interval
  const clearCooldownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start or update the cooldown timer (does not set initial state, only starts interval)
  const startCooldown = useCallback(() => {
    clearCooldownInterval();

    // Check current cooldown state
    const { remainingMs: currentRemaining } = checkRefreshCooldown();

    // If there's remaining cooldown, start an interval to update it
    if (currentRemaining > 0) {
      intervalRef.current = setInterval(() => {
        const { remainingMs: remaining } = checkRefreshCooldown();
        setRemainingMs(remaining);

        // Clear interval when cooldown expires
        if (remaining <= 0) {
          clearCooldownInterval();
        }
      }, 1000); // Update every second
    }
  }, [clearCooldownInterval]);

  // Check if action is allowed, update state, and optionally record a new action
  const checkAndStartCooldown = useCallback((): boolean => {
    const { allowed, remainingMs: currentRemainingMs } = checkRefreshCooldown();

    if (!allowed) {
      // Not allowed, update the cooldown display and start timer
      setRemainingMs(currentRemainingMs);
      startCooldown();
      return false;
    }

    // Action is allowed - record the action time and start cooldown
    setLastRefreshTime(Date.now());
    // After recording, check the new cooldown state
    const { remainingMs: newRemainingMs } = checkRefreshCooldown();
    setRemainingMs(newRemainingMs);
    startCooldown();
    return true;
  }, [startCooldown]);

  // Start interval on mount if there's a cooldown
  useEffect(() => {
    // Only start interval if there's remaining cooldown
    if (remainingMs > 0) {
      startCooldown();
    }
    return () => {
      clearCooldownInterval();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    remainingMs,
    isAllowed: remainingMs <= 0,
    startCooldown,
    checkAndStartCooldown,
  };
}

export default useCooldownTimer;
