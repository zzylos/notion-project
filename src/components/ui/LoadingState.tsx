import React from 'react';
import { Loader2 } from 'lucide-react';

type LoadingStateSize = 'sm' | 'md' | 'lg';

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size of the loading indicator */
  size?: LoadingStateSize;
  /** Whether to show as inline or fullscreen */
  inline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<LoadingStateSize, { icon: string; text: string }> = {
  sm: { icon: 'w-4 h-4', text: 'text-xs' },
  md: { icon: 'w-6 h-6', text: 'text-sm' },
  lg: { icon: 'w-8 h-8', text: 'text-base' },
};

/**
 * A standardized loading state component.
 *
 * Provides consistent loading indicators across the application with
 * size variants and optional messages.
 *
 * @example
 * // Basic usage
 * <LoadingState />
 *
 * // With message
 * <LoadingState message="Loading items..." />
 *
 * // Inline small loading
 * <LoadingState size="sm" inline />
 *
 * // Full container loading
 * <LoadingState message="Fetching data from Notion..." size="lg" />
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'md',
  inline = false,
  className = '',
}) => {
  const { icon: iconClass, text: textClass } = sizeClasses[size];

  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-2 text-gray-500 ${className}`}
        role="status"
        aria-label={message || 'Loading'}
      >
        <Loader2 className={`${iconClass} animate-spin`} />
        {message && <span className={textClass}>{message}</span>}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 ${className}`}
      role="status"
      aria-label={message || 'Loading'}
    >
      <Loader2 className={`${iconClass} text-blue-500 animate-spin mb-3`} />
      {message && (
        <p className={`${textClass} text-gray-600`}>{message}</p>
      )}
    </div>
  );
};

export default LoadingState;
