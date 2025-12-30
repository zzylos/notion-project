import { memo, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { ItemType } from '../../types';
import { typeColors, typeLabels } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import CollapsibleSection from './CollapsibleSection';

const ITEM_TYPES: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

interface TypeFilterSectionProps {
  selectedTypes: ItemType[];
  excludedTypes: ItemType[];
  onToggle: (type: ItemType) => void;
  onToggleExclude: (type: ItemType) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

type FilterState = 'neutral' | 'included' | 'excluded';

function getFilterState(
  type: ItemType,
  selectedTypes: ItemType[],
  excludedTypes: ItemType[]
): FilterState {
  if (selectedTypes.includes(type)) return 'included';
  if (excludedTypes.includes(type)) return 'excluded';
  return 'neutral';
}

const TypeFilterSection: React.FC<TypeFilterSectionProps> = memo(
  ({ selectedTypes, excludedTypes, onToggle, onToggleExclude, isOpen, onToggleSection }) => {
    // Click cycles: neutral → included → excluded → neutral
    const handleClick = useCallback(
      (type: ItemType, e: React.MouseEvent) => {
        e.preventDefault();
        const state = getFilterState(type, selectedTypes, excludedTypes);

        if (state === 'neutral') {
          // Click when neutral → include (show only these)
          onToggle(type);
        } else if (state === 'included') {
          // Click when included → exclude (switch to hide mode)
          onToggle(type); // Remove from include
          onToggleExclude(type); // Add to exclude
        } else {
          // Click when excluded → neutral
          onToggleExclude(type); // Remove from exclude
        }
      },
      [selectedTypes, excludedTypes, onToggle, onToggleExclude]
    );

    const totalCount = selectedTypes.length + excludedTypes.length;

    return (
      <CollapsibleSection
        title="Type"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={totalCount}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {ITEM_TYPES.map(type => {
            const Icon = typeIcons[type];
            const state = getFilterState(type, selectedTypes, excludedTypes);
            const style = typeColors[type];

            let buttonClass = '';
            const labelContent = typeLabels[type];

            if (state === 'included') {
              buttonClass = `${style.bg} ${style.text} ${style.border} border`;
            } else if (state === 'excluded') {
              buttonClass =
                'bg-red-50 text-red-700 border border-red-300 line-through decoration-red-400';
            } else {
              buttonClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent';
            }

            return (
              <button
                key={type}
                onClick={e => handleClick(type, e)}
                aria-pressed={state !== 'neutral'}
                title={
                  state === 'neutral'
                    ? `Click to show only ${typeLabels[type]}`
                    : state === 'included'
                      ? `Click to hide ${typeLabels[type]} instead`
                      : `Click to clear filter for ${typeLabels[type]}`
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
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {labelContent}
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

TypeFilterSection.displayName = 'TypeFilterSection';

export default TypeFilterSection;
