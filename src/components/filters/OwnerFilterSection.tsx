import { memo, useMemo, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { WorkItem } from '../../types';
import CollapsibleSection from './CollapsibleSection';

interface OwnerFilterSectionProps {
  items: Map<string, WorkItem>;
  selectedOwners: string[];
  excludedOwners: string[];
  onToggle: (ownerId: string) => void;
  onToggleExclude: (ownerId: string) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

type FilterState = 'neutral' | 'included' | 'excluded';

function getFilterState(
  ownerId: string,
  selectedOwners: string[],
  excludedOwners: string[]
): FilterState {
  if (selectedOwners.includes(ownerId)) return 'included';
  if (excludedOwners.includes(ownerId)) return 'excluded';
  return 'neutral';
}

const OwnerFilterSection: React.FC<OwnerFilterSectionProps> = memo(
  ({
    items,
    selectedOwners,
    excludedOwners,
    onToggle,
    onToggleExclude,
    isOpen,
    onToggleSection,
  }) => {
    // Get unique owners from items
    const owners = useMemo(() => {
      const itemsArray = Array.from(items.values());
      const ownerMap = itemsArray.reduce((acc, item) => {
        if (item.owner && !acc.has(item.owner.id)) {
          acc.set(item.owner.id, { id: item.owner.id, name: item.owner.name });
        }
        return acc;
      }, new Map<string, { id: string; name: string }>());
      return Array.from(ownerMap.values());
    }, [items]);

    const handleClick = useCallback(
      (ownerId: string, e: React.MouseEvent) => {
        e.preventDefault();
        const state = getFilterState(ownerId, selectedOwners, excludedOwners);

        if (state === 'neutral') {
          onToggle(ownerId);
        } else if (state === 'included') {
          onToggle(ownerId);
          onToggleExclude(ownerId);
        } else {
          onToggleExclude(ownerId);
        }
      },
      [selectedOwners, excludedOwners, onToggle, onToggleExclude]
    );

    if (owners.length === 0) {
      return null;
    }

    const totalCount = selectedOwners.length + excludedOwners.length;

    return (
      <CollapsibleSection
        title="Owner"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={totalCount}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by owner">
          {owners.map(owner => {
            const state = getFilterState(owner.id, selectedOwners, excludedOwners);

            let buttonClass = '';
            if (state === 'included') {
              buttonClass = 'bg-blue-100 text-blue-700 border border-blue-300';
            } else if (state === 'excluded') {
              buttonClass =
                'bg-red-50 text-red-700 border border-red-300 line-through decoration-red-400';
            } else {
              buttonClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent';
            }

            return (
              <button
                key={owner.id}
                onClick={e => handleClick(owner.id, e)}
                aria-pressed={state !== 'neutral'}
                title={
                  state === 'neutral'
                    ? `Click to show only ${owner.name}'s items`
                    : state === 'included'
                      ? `Click to hide ${owner.name}'s items instead`
                      : `Click to clear filter for ${owner.name}`
                }
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${buttonClass}
                `}
              >
                {state === 'excluded' ? (
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <div
                    className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-medium"
                    aria-hidden="true"
                  >
                    {owner.name?.charAt(0) || '?'}
                  </div>
                )}
                {owner.name}
              </button>
            );
          })}
        </div>
        {totalCount > 0 && (
          <p className="text-xs text-gray-500 mt-2">Click to cycle: show → hide → clear</p>
        )}
      </CollapsibleSection>
    );
  }
);

OwnerFilterSection.displayName = 'OwnerFilterSection';

export default OwnerFilterSection;
