import React from 'react';
import { getProgressColor } from '../../utils/colors';

interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className for container */
  className?: string;
}

/**
 * Reusable progress bar component with consistent styling.
 * Color changes based on progress level (green > 80%, amber > 50%, red otherwise).
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = 'md',
  className = '',
}) => {
  const heightClass = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }[size];

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
          <span>Progress</span>
          <span>{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full ${heightClass} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(clampedProgress)}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
