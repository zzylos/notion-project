import { memo } from 'react';
import type { Priority } from '../../types';
import { priorityColors, priorityLabels } from '../../utils/colors';

interface PriorityBadgeProps {
  priority: Priority;
  /** Size variant: 'sm' for compact, 'md' for normal */
  size?: 'sm' | 'md';
  /** Whether to show the priority label (e.g., "Critical") in addition to code */
  showLabel?: boolean;
  className?: string;
}

/**
 * Reusable priority badge component with consistent styling across the app.
 * Displays priority code (P0-P3) with appropriate color coding.
 */
const PriorityBadge: React.FC<PriorityBadgeProps> = memo(
  ({ priority, size = 'md', showLabel = false, className = '' }) => {
    const style = priorityColors[priority];

    const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

    return (
      <span
        className={`
        inline-flex items-center rounded font-semibold
        ${style.bg} ${style.text}
        ${sizeClasses}
        ${className}
      `}
      >
        {priority}
        {showLabel && ` - ${priorityLabels[priority]}`}
      </span>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';

export default PriorityBadge;
