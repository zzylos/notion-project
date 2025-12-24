import React, { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { WorkItem } from '../../types';
import RelationshipItem, { type RelationshipVariant } from './RelationshipItem';

interface RelationshipListProps {
  /** Section title */
  title: string;
  /** Icon to display before the title */
  icon: LucideIcon;
  /** List of related work items */
  items: WorkItem[];
  /** Click handler to navigate to an item */
  onNavigate: (id: string) => void;
  /** Visual variant for items */
  variant?: RelationshipVariant;
  /** Whether to show status dots on items */
  showStatusDot?: boolean;
  /** Additional title text (e.g., count) */
  titleSuffix?: string;
  /** Icon color class override */
  iconColorClass?: string;
}

/**
 * A section displaying a list of related work items.
 * Used in DetailPanel for parent, children, and blockedBy sections.
 */
const RelationshipList: React.FC<RelationshipListProps> = memo(
  ({
    title,
    icon: Icon,
    items,
    onNavigate,
    variant = 'default',
    showStatusDot = false,
    titleSuffix,
    iconColorClass,
  }) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <Icon className={`w-3 h-3 ${iconColorClass || ''}`} />
          {title}
          {titleSuffix && <span>{titleSuffix}</span>}
        </label>
        <div className="space-y-1">
          {items.map(item => (
            <RelationshipItem
              key={item.id}
              item={item}
              onNavigate={onNavigate}
              variant={variant}
              showStatusDot={showStatusDot}
            />
          ))}
        </div>
      </div>
    );
  }
);

RelationshipList.displayName = 'RelationshipList';

export default RelationshipList;
