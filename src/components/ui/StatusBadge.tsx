import React from 'react';
import { getStatusColors, getStatusCategory } from '../../utils/colors';

interface StatusBadgeProps {
  status: string;
  /** Show status text label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

/**
 * Reusable status badge component with consistent styling.
 * Displays a colored dot and optional label based on status.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const statusStyle = getStatusColors(status);
  const isInProgress = getStatusCategory(status) === 'in-progress';

  const dotSizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSizeClass = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const paddingClass = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  if (!showLabel) {
    return (
      <div
        className={`${dotSizeClass} rounded-full ${statusStyle.dot} ${
          isInProgress ? 'animate-pulse' : ''
        } ${className}`}
        title={status}
      />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${paddingClass} ${textSizeClass}
        ${statusStyle.bg} ${statusStyle.text}
        ${className}
      `}
    >
      <div
        className={`${dotSizeClass} rounded-full ${statusStyle.dot} ${
          isInProgress ? 'animate-pulse' : ''
        }`}
      />
      {status}
    </span>
  );
};

export default StatusBadge;
