import { useMemo, memo } from 'react';
import { Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useItemLimit } from '../../hooks/useItemLimit';
import { getStatusColors } from '../../utils/colors';
import { parseDate, isOverdue, formatDate } from '../../utils/dateUtils';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ItemLimitBanner from '../ui/ItemLimitBanner';

const TimelineView: React.FC = memo(() => {
  const { getFilteredItems, setSelectedItem, selectedItemId, isLoading } = useStore();

  // Memoize filtered and sorted items to avoid recreation on every render
  const allSortedItems = useMemo(() => {
    const items = getFilteredItems().filter(item => {
      if (!item.dueDate) return false;
      // Validate date format
      return parseDate(item.dueDate) !== null;
    });

    return [...items].sort((a, b) => {
      const dateA = parseDate(a.dueDate!);
      const dateB = parseDate(b.dueDate!);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [getFilteredItems]);

  // Apply item limit for performance
  const { limitedItems: sortedItems, totalCount, isLimited } = useItemLimit(allSortedItems);

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading timeline..." size="lg" className="h-64" />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Item limit warning banner */}
      {isLimited && <ItemLimitBanner totalItems={totalCount} displayedItems={sortedItems.length} />}

      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-2 mb-4 text-gray-500">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">Timeline View - Items with due dates</span>
        </div>
        {sortedItems.length === 0 ? (
          <EmptyState
            title="No items with due dates"
            description="Items need a due date to appear in the timeline"
            icon={<Calendar className="w-12 h-12" />}
            className="py-8"
          />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {sortedItems.map(item => {
                const itemIsOverdue = isOverdue(item.dueDate, item.status);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 pl-1 cursor-pointer"
                    onClick={() => setSelectedItem(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedItem(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.title}, due ${item.dueDate && formatDate(item.dueDate, 'medium')}${itemIsOverdue ? ', overdue' : ''}`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColors(item.status).dot} ring-4 ring-white z-10`}
                    />
                    <div
                      className={`flex-1 bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow ${
                        selectedItemId === item.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{item.title}</span>
                        <span
                          className={`text-xs ${itemIsOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}
                        >
                          {item.dueDate && formatDate(item.dueDate, 'medium')}
                          {itemIsOverdue && ' (OVERDUE)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{item.type}</span>
                        {item.owner && <span>• {item.owner.name}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TimelineView.displayName = 'TimelineView';

export default TimelineView;
