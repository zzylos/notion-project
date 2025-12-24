import { memo, useCallback } from 'react';
import type { Priority } from '../../types';
import { priorityColors, priorityLabels } from '../../utils/colors';
import CollapsibleSection from './CollapsibleSection';

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

interface PriorityFilterSectionProps {
  selectedPriorities: Priority[];
  onToggle: (priority: Priority) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

const PriorityFilterSection: React.FC<PriorityFilterSectionProps> = memo(
  ({ selectedPriorities, onToggle, isOpen, onToggleSection }) => {
    const handleToggle = useCallback(
      (priority: Priority) => {
        onToggle(priority);
      },
      [onToggle]
    );

    return (
      <CollapsibleSection
        title="Priority"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={selectedPriorities.length}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by priority">
          {PRIORITIES.map(priority => {
            const isActive = selectedPriorities.includes(priority);
            const style = priorityColors[priority];
            return (
              <button
                key={priority}
                onClick={() => handleToggle(priority)}
                aria-pressed={isActive}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-semibold
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${
                    isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }
                `}
              >
                {priority} - {priorityLabels[priority]}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>
    );
  }
);

PriorityFilterSection.displayName = 'PriorityFilterSection';

export default PriorityFilterSection;
