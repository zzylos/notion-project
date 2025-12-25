import { memo, useMemo, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { WorkItem } from '../../types';
import { getStatusColors, getStatusCategory } from '../../utils/colors';
import { STATUS_GROUPS, STATUS_TO_GROUP } from '../../constants';
import CollapsibleSection from './CollapsibleSection';

interface StatusFilterSectionProps {
  items: Map<string, WorkItem>;
  selectedStatuses: string[];
  excludedStatuses: string[];
  onToggleStatus: (status: string) => void;
  onToggleExcludeStatus: (status: string) => void;
  onToggleGroup: (groupName: string, groupStatuses: string[]) => void;
  onToggleExcludeGroup: (groupName: string, groupStatuses: string[]) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

type FilterState = 'neutral' | 'included' | 'excluded';

const StatusFilterSection: React.FC<StatusFilterSectionProps> = memo(
  ({
    items,
    selectedStatuses,
    excludedStatuses,
    onToggleStatus,
    onToggleExcludeStatus,
    onToggleGroup,
    onToggleExcludeGroup,
    isOpen,
    onToggleSection,
  }) => {
    // Get unique statuses from items and group them
    const { statusGroups, ungroupedStatuses } = useMemo(() => {
      const itemsArray = Array.from(items.values());
      const uniqueStatuses = [...new Set(itemsArray.map(item => item.status))];

      // Track which statuses belong to which group
      const groupedStatuses = new Map<string, Set<string>>();
      const ungrouped: string[] = [];

      for (const status of uniqueStatuses) {
        const groupName = STATUS_TO_GROUP.get(status.toLowerCase());
        if (groupName) {
          if (!groupedStatuses.has(groupName)) {
            groupedStatuses.set(groupName, new Set());
          }
          groupedStatuses.get(groupName)!.add(status);
        } else {
          ungrouped.push(status);
        }
      }

      return {
        statusGroups: groupedStatuses,
        ungroupedStatuses: ungrouped,
      };
    }, [items]);

    // Get the filter state for a single status
    const getStatusState = useCallback(
      (status: string): FilterState => {
        if (selectedStatuses.includes(status)) return 'included';
        if (excludedStatuses.includes(status)) return 'excluded';
        return 'neutral';
      },
      [selectedStatuses, excludedStatuses]
    );

    // Get the filter state for a status group
    const getGroupState = useCallback(
      (groupName: string): FilterState => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses || groupStatuses.size === 0) return 'neutral';

        const statusArray = Array.from(groupStatuses);
        const allIncluded = statusArray.every(s => selectedStatuses.includes(s));
        const allExcluded = statusArray.every(s => excludedStatuses.includes(s));

        if (allIncluded) return 'included';
        if (allExcluded) return 'excluded';
        return 'neutral';
      },
      [selectedStatuses, excludedStatuses, statusGroups]
    );

    // Check if a status group is partially in any state
    const isGroupPartial = useCallback(
      (groupName: string): boolean => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses || groupStatuses.size === 0) return false;

        const statusArray = Array.from(groupStatuses);
        const includedCount = statusArray.filter(s => selectedStatuses.includes(s)).length;
        const excludedCount = statusArray.filter(s => excludedStatuses.includes(s)).length;

        return (
          (includedCount > 0 && includedCount < statusArray.length) ||
          (excludedCount > 0 && excludedCount < statusArray.length)
        );
      },
      [selectedStatuses, excludedStatuses, statusGroups]
    );

    // Get representative status for color
    const getGroupColor = useCallback((groupName: string) => {
      const originalStatuses = STATUS_GROUPS[groupName];
      if (originalStatuses && originalStatuses.length > 0) {
        return getStatusColors(originalStatuses[0]);
      }
      return getStatusColors('Not Started');
    }, []);

    // Get status category for group (for the dot color)
    const getGroupCategory = useCallback((groupName: string) => {
      const originalStatuses = STATUS_GROUPS[groupName];
      if (originalStatuses && originalStatuses.length > 0) {
        return getStatusCategory(originalStatuses[0]);
      }
      return 'not-started';
    }, []);

    // Handle click on status group - cycle through states
    const handleGroupClick = useCallback(
      (groupName: string) => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses) return;

        const statusArray = Array.from(groupStatuses);
        const state = getGroupState(groupName);

        if (state === 'neutral') {
          // Add to include
          onToggleGroup(groupName, statusArray);
        } else if (state === 'included') {
          // Remove from include, add to exclude
          onToggleGroup(groupName, statusArray);
          onToggleExcludeGroup(groupName, statusArray);
        } else {
          // Remove from exclude
          onToggleExcludeGroup(groupName, statusArray);
        }
      },
      [statusGroups, getGroupState, onToggleGroup, onToggleExcludeGroup]
    );

    // Handle click on individual status - cycle through states
    const handleStatusClick = useCallback(
      (status: string) => {
        const state = getStatusState(status);

        if (state === 'neutral') {
          onToggleStatus(status);
        } else if (state === 'included') {
          onToggleStatus(status);
          onToggleExcludeStatus(status);
        } else {
          onToggleExcludeStatus(status);
        }
      },
      [getStatusState, onToggleStatus, onToggleExcludeStatus]
    );

    const totalCount = selectedStatuses.length + excludedStatuses.length;

    return (
      <CollapsibleSection
        title="Status"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={totalCount}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {/* Grouped statuses */}
          {Array.from(statusGroups.keys()).map(groupName => {
            const state = getGroupState(groupName);
            const isPartial = isGroupPartial(groupName);
            const style = getGroupColor(groupName);
            const category = getGroupCategory(groupName);
            const groupStatuses = statusGroups.get(groupName);
            const count = groupStatuses?.size || 0;

            let buttonClass = '';
            if (state === 'included') {
              buttonClass = `${style.bg} ${style.text} ${style.border} border`;
            } else if (state === 'excluded') {
              buttonClass =
                'bg-red-50 text-red-700 border border-red-300 line-through decoration-red-400';
            } else if (isPartial) {
              buttonClass = `${style.bg} ${style.text} ${style.border} border opacity-70`;
            } else {
              buttonClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent';
            }

            return (
              <button
                key={groupName}
                onClick={() => handleGroupClick(groupName)}
                aria-pressed={state !== 'neutral'}
                title={
                  state === 'neutral'
                    ? `Click to show only ${groupName}. Includes: ${Array.from(groupStatuses || []).join(', ')}`
                    : state === 'included'
                      ? `Click to hide ${groupName} instead`
                      : `Click to clear filter for ${groupName}`
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
                    className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                )}
                {groupName}
                {count > 1 && <span className="ml-0.5 text-[10px] opacity-60">({count})</span>}
              </button>
            );
          })}

          {/* Ungrouped statuses */}
          {ungroupedStatuses.map(status => {
            const state = getStatusState(status);
            const style = getStatusColors(status);
            const category = getStatusCategory(status);

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
                key={status}
                onClick={() => handleStatusClick(status)}
                aria-pressed={state !== 'neutral'}
                title={
                  state === 'neutral'
                    ? `Click to show only ${status}`
                    : state === 'included'
                      ? `Click to hide ${status} instead`
                      : `Click to clear filter for ${status}`
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
                    className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                )}
                {status}
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

StatusFilterSection.displayName = 'StatusFilterSection';

export default StatusFilterSection;
