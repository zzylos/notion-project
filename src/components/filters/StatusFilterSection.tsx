import { memo, useMemo, useCallback } from 'react';
import type { WorkItem } from '../../types';
import { getStatusColors, getStatusCategory } from '../../utils/colors';
import { STATUS_GROUPS, STATUS_TO_GROUP } from '../../constants';
import CollapsibleSection from './CollapsibleSection';

interface StatusFilterSectionProps {
  items: Map<string, WorkItem>;
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
  onToggleGroup: (groupName: string, groupStatuses: string[]) => void;
  isOpen: boolean;
  onToggleSection: () => void;
}

const StatusFilterSection: React.FC<StatusFilterSectionProps> = memo(
  ({ items, selectedStatuses, onToggleStatus, onToggleGroup, isOpen, onToggleSection }) => {
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

    // Check if a status group is selected (all statuses in group are selected)
    const isGroupSelected = useCallback(
      (groupName: string) => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses || groupStatuses.size === 0) return false;
        return Array.from(groupStatuses).every(s => selectedStatuses.includes(s));
      },
      [selectedStatuses, statusGroups]
    );

    // Check if a status group is partially selected
    const isGroupPartiallySelected = useCallback(
      (groupName: string) => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses || groupStatuses.size === 0) return false;
        const selectedCount = Array.from(groupStatuses).filter(s =>
          selectedStatuses.includes(s)
        ).length;
        return selectedCount > 0 && selectedCount < groupStatuses.size;
      },
      [selectedStatuses, statusGroups]
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

    const handleToggleGroup = useCallback(
      (groupName: string) => {
        const groupStatuses = statusGroups.get(groupName);
        if (!groupStatuses) return;
        onToggleGroup(groupName, Array.from(groupStatuses));
      },
      [statusGroups, onToggleGroup]
    );

    return (
      <CollapsibleSection
        title="Status"
        isOpen={isOpen}
        onToggle={onToggleSection}
        count={selectedStatuses.length}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {/* Grouped statuses */}
          {Array.from(statusGroups.keys()).map(groupName => {
            const isActive = isGroupSelected(groupName);
            const isPartial = isGroupPartiallySelected(groupName);
            const style = getGroupColor(groupName);
            const category = getGroupCategory(groupName);
            const groupStatuses = statusGroups.get(groupName);
            const count = groupStatuses?.size || 0;

            return (
              <button
                key={groupName}
                onClick={() => handleToggleGroup(groupName)}
                aria-pressed={isActive}
                title={`Includes: ${Array.from(groupStatuses || []).join(', ')}`}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${
                    isActive
                      ? `${style.bg} ${style.text} ${style.border} border`
                      : isPartial
                        ? `${style.bg} ${style.text} ${style.border} border opacity-70`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }
                `}
              >
                <div
                  className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                  aria-hidden="true"
                />
                {groupName}
                {count > 1 && <span className="ml-0.5 text-[10px] opacity-60">({count})</span>}
              </button>
            );
          })}

          {/* Ungrouped statuses */}
          {ungroupedStatuses.map(status => {
            const isActive = selectedStatuses.includes(status);
            const style = getStatusColors(status);
            const category = getStatusCategory(status);
            return (
              <button
                key={status}
                onClick={() => onToggleStatus(status)}
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
                <div
                  className={`w-2 h-2 rounded-full ${style.dot} ${category === 'in-progress' ? 'animate-pulse' : ''}`}
                  aria-hidden="true"
                />
                {status}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>
    );
  }
);

StatusFilterSection.displayName = 'StatusFilterSection';

export default StatusFilterSection;
