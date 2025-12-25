import { useState, useCallback, useEffect, type RefObject } from 'react';
import { logger } from '../utils/logger';

/**
 * Return type for the useFullscreen hook.
 */
export interface UseFullscreenReturn {
  /** Whether the element is currently in fullscreen mode */
  isFullscreen: boolean;
  /** Toggle fullscreen mode on/off */
  toggleFullscreen: () => Promise<void>;
  /** Enter fullscreen mode */
  enterFullscreen: () => Promise<void>;
  /** Exit fullscreen mode */
  exitFullscreen: () => Promise<void>;
}

/**
 * Hook for managing fullscreen state on a referenced element.
 *
 * @param elementRef - Ref to the element that should go fullscreen
 * @returns Fullscreen state and control functions
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
 *
 * return (
 *   <div ref={containerRef}>
 *     <button onClick={toggleFullscreen}>
 *       {isFullscreen ? 'Exit' : 'Fullscreen'}
 *     </button>
 *   </div>
 * );
 */
export function useFullscreen(elementRef: RefObject<HTMLElement | null>): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes (including ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!elementRef.current) return;

    try {
      await elementRef.current.requestFullscreen();
    } catch (error: unknown) {
      handleFullscreenError(error);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;

    try {
      await document.exitFullscreen();
    } catch (error: unknown) {
      handleFullscreenError(error);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}

/**
 * Handle fullscreen API errors with appropriate logging.
 */
function handleFullscreenError(error: unknown): void {
  if (!(error instanceof Error)) return;

  const isPermissionError = error.name === 'SecurityError' || error.name === 'NotAllowedError';
  const isNotSupported = error.name === 'TypeError';

  if (isPermissionError) {
    logger.warn('Fullscreen', `Fullscreen not allowed: ${error.message}`);
  } else if (isNotSupported) {
    logger.warn('Fullscreen', 'Fullscreen API not supported');
  } else {
    logger.error('Fullscreen', 'Unexpected fullscreen error:', error);
  }
}

export default useFullscreen;
