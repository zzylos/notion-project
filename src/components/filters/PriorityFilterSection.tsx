import { memo, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { Priority } from '../../types';
import { priorityColors, priorityLabels } from '../../utils/colors';
import CollapsibleSection from './CollapsibleSection';

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

interface PriorityFilterSectionProps {
  selectedPriorities: Priority[];
  excludedPriorities: Priority[];
  onToggle: (priority: Priority) => void;
  onToggleExclude: (priority: Priority) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

type FilterState = 'neutral' | 'included' | 'excluded';

function getFilterState(
  priority: Priority,
  selectedPriorities: Priority[],
  excludedPriorities: Priority[]
): FilterState {
  if (selectedPriorities.includes(priority)) return 'included';
  if (excludedPriorities.includes(priority)) return 'excluded';
  return 'neutral';
}

const PriorityFilterSection: React.FC<PriorityFilterSectionProps> = memo(
  ({
    selectedPriorities,
    excludedPriorities,
    onToggle,
    onToggleExclude,
    isOpen,
    onToggleSection,
  }) => {
    const handleClick = useCallback(
      (priority: Priority, e: React.MouseEvent) => {
        e.preventDefault();
        const state = getFilterState(priority, selectedPriorities, excludedPriorities);

        if (state === 'neutral') {
          onToggle(priority);
        } else if (state === 'included') {
          onToggle(priority);
          onToggleExclude(priority);
        } else {
          onToggleExclude(priority);
        }
      },
      [selectedPriorities, excludedPriorities, onToggle, onToggleExclude]
    );

    const totalCount = selectedPriorities.length + excludedPriorities.length;

    return (
      <CollapsibleSection
        title="Priority"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={totalCount}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by priority">
          {PRIORITIES.map(priority => {
            const state = getFilterState(priority, selectedPriorities, excludedPriorities);
            const style = priorityColors[priority];

            let buttonClass = '';
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
                key={priority}
                onClick={e => handleClick(priority, e)}
                aria-pressed={state !== 'neutral'}
                title={
                  state === 'neutral'
                    ? `Click to show only ${priority}`
                    : state === 'included'
                      ? `Click to hide ${priority} instead`
                      : `Click to clear filter for ${priority}`
                }
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${buttonClass}
                `}
              >
                {state === 'excluded' && <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
                {priority} - {priorityLabels[priority]}
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

PriorityFilterSection.displayName = 'PriorityFilterSection';

export default PriorityFilterSection;
