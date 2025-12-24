import React, { memo } from 'react';
import type { WorkItem, ItemType } from '../../types';
import { getStatusColors, typeColors } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';

export type RelationshipVariant = 'default' | 'blocked';

interface RelationshipItemProps {
  /** The work item to display */
  item: WorkItem;
  /** Click handler to navigate to the item */
  onNavigate: (id: string) => void;
  /** Visual variant - 'blocked' shows red styling */
  variant?: RelationshipVariant;
  /** Whether to show the status dot */
  showStatusDot?: boolean;
}

// Valid item types - defined outside component to avoid recreating
const VALID_TYPES: readonly ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

/**
 * Renders the icon for a work item type.
 * Separated to avoid React Compiler issues with dynamic component creation.
 */
function TypeIconDisplay({
  type,
  className,
}: {
  type: ItemType;
  className: string;
}): React.ReactElement | null {
  const Icon = typeIcons[type];
  if (!Icon) return null;
  return <Icon className={className} />;
}

/**
 * A clickable item in a relationship list (parent, child, blocker).
 * Used in DetailPanel to display connected work items.
 */
const RelationshipItem: React.FC<RelationshipItemProps> = memo(
  ({ item, onNavigate, variant = 'default', showStatusDot = false }) => {
    // Validate that we have a valid ItemType first
    if (!VALID_TYPES.includes(item.type)) {
      return null;
    }

    const typeStyle = typeColors[item.type];
    const statusStyle = getStatusColors(item.status);
    const isBlocked = variant === 'blocked';

    return (
      <button
        onClick={() => onNavigate(item.id)}
        className={`
          flex items-center gap-2 w-full p-2 text-left rounded-lg transition-colors
          ${isBlocked ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}
        `}
      >
        <TypeIconDisplay
          type={item.type}
          className={`w-4 h-4 flex-shrink-0 ${isBlocked ? 'text-red-600' : typeStyle?.icon || ''}`}
        />
        <span className={`text-sm truncate flex-1 ${isBlocked ? 'text-red-800' : 'text-gray-800'}`}>
          {item.title}
        </span>
        {showStatusDot && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
        )}
        {isBlocked && (
          <span
            className={`
              ml-auto px-1.5 py-0.5 text-xs rounded flex-shrink-0
              ${statusStyle.bg} ${statusStyle.text}
            `}
          >
            {item.status}
          </span>
        )}
      </button>
    );
  }
);

RelationshipItem.displayName = 'RelationshipItem';

export default RelationshipItem;
