import { memo, useCallback } from 'react';
import type { ItemType } from '../../types';
import { typeColors, typeLabels } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import CollapsibleSection from './CollapsibleSection';

const ITEM_TYPES: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

interface TypeFilterSectionProps {
  selectedTypes: ItemType[];
  onToggle: (type: ItemType) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

const TypeFilterSection: React.FC<TypeFilterSectionProps> = memo(
  ({ selectedTypes, onToggle, isOpen, onToggleSection }) => {
    const handleToggle = useCallback(
      (type: ItemType) => {
        onToggle(type);
      },
      [onToggle]
    );

    return (
      <CollapsibleSection
        title="Type"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={selectedTypes.length}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {ITEM_TYPES.map(type => {
            const Icon = typeIcons[type];
            const isActive = selectedTypes.includes(type);
            const style = typeColors[type];
            return (
              <button
                key={type}
                onClick={() => handleToggle(type)}
                aria-pressed={isActive}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${
                    isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {typeLabels[type]}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>
    );
  }
);

TypeFilterSection.displayName = 'TypeFilterSection';

export default TypeFilterSection;
