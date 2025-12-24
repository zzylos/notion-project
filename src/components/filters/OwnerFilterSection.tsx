import { memo, useMemo, useCallback } from 'react';
import type { WorkItem } from '../../types';
import CollapsibleSection from './CollapsibleSection';

interface OwnerFilterSectionProps {
  items: Map<string, WorkItem>;
  selectedOwners: string[];
  onToggle: (ownerId: string) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

const OwnerFilterSection: React.FC<OwnerFilterSectionProps> = memo(
  ({ items, selectedOwners, onToggle, isOpen, onToggleSection }) => {
    // Get unique owners from items
    const owners = useMemo(() => {
      const itemsArray = Array.from(items.values());
      const ownerMap = itemsArray.reduce(
        (acc, item) => {
          if (item.owner && !acc.has(item.owner.id)) {
            acc.set(item.owner.id, { id: item.owner.id, name: item.owner.name });
          }
          return acc;
        },
        new Map<string, { id: string; name: string }>()
      );
      return Array.from(ownerMap.values());
    }, [items]);

    const handleToggle = useCallback(
      (ownerId: string) => {
        onToggle(ownerId);
      },
      [onToggle]
    );

    if (owners.length === 0) {
      return null;
    }

    return (
      <CollapsibleSection
        title="Owner"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={selectedOwners.length}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by owner">
          {owners.map(owner => {
            const isActive = selectedOwners.includes(owner.id);
            return (
              <button
                key={owner.id}
                onClick={() => handleToggle(owner.id)}
                aria-pressed={isActive}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }
                `}
              >
                <div
                  className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-medium"
                  aria-hidden="true"
                >
                  {owner.name?.charAt(0) || '?'}
                </div>
                {owner.name}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>
    );
  }
);

OwnerFilterSection.displayName = 'OwnerFilterSection';

export default OwnerFilterSection;
