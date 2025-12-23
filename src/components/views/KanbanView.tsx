import { useMemo, useState, useCallback, memo } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useItemLimit } from '../../hooks/useItemLimit';
import { getStatusColors, getUniqueStatuses } from '../../utils/colors';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ItemLimitBanner from '../ui/ItemLimitBanner';

const KanbanView: React.FC = memo(() => {
  const {
    getFilteredItems,
    setSelectedItem,
    selectedItemId,
    items: allItems,
    isLoading,
  } = useStore();
  const allFilteredItems = getFilteredItems();

  // Apply item limit for performance
  const { limitedItems: filteredItems, totalCount, isLimited } = useItemLimit(allFilteredItems);
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  // Get unique statuses from all items, preserving order of first occurrence
  const statuses = useMemo(() => getUniqueStatuses(allItems.values()), [allItems]);

  // Pre-compute status items to avoid repeated filtering
  const statusItemsMap = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const status of statuses) {
      map.set(
        status,
        filteredItems.filter(item => item.status === status)
      );
    }
    return map;
  }, [statuses, filteredItems]);

  // Count empty columns
  const emptyColumnCount = useMemo(() => {
    let count = 0;
    for (const items of statusItemsMap.values()) {
      if (items.length === 0) count++;
    }
    return count;
  }, [statusItemsMap]);

  const toggleHideEmpty = useCallback(() => {
    setHideEmptyColumns(prev => !prev);
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading board..." size="lg" className="h-64" />;
  }

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <EmptyState
        variant="filter"
        title="No items found"
        description="Try adjusting your filters or search query"
        className="h-64"
      />
    );
  }

  return (
    <div className="h-full flex flex-col" role="region" aria-label="Kanban board">
      {/* Item limit warning banner */}
      {isLimited && (
        <ItemLimitBanner totalItems={totalCount} displayedItems={filteredItems.length} />
      )}

      <div className="flex-1 overflow-auto p-4">
        {/* Controls */}
        {emptyColumnCount > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={toggleHideEmpty}
              className={`
              flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
              ${
                hideEmptyColumns
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
              aria-pressed={hideEmptyColumns}
            >
              {hideEmptyColumns ? (
                <>
                  <Eye className="w-4 h-4" />
                  Show empty columns ({emptyColumnCount})
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide empty columns ({emptyColumnCount})
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex gap-4 min-w-max" role="list" aria-label="Status columns">
          {statuses.map((status, statusIndex) => {
            const statusItems = statusItemsMap.get(status) || [];
            const colors = getStatusColors(status);
            const isEmpty = statusItems.length === 0;
            // Use index to ensure unique IDs even if status names normalize to same value
            const columnId = `column-${statusIndex}-${status.replace(/\s+/g, '-').toLowerCase()}`;

            // Skip empty columns if hidden
            if (hideEmptyColumns && isEmpty) {
              return null;
            }

            return (
              <div
                key={status}
                className={`w-72 flex-shrink-0 ${isEmpty ? 'opacity-50' : ''}`}
                role="listitem"
                aria-label={`${status} column with ${statusItems.length} items`}
              >
                <div className={`rounded-lg border ${colors.bg} ${colors.border} p-3 mb-3`}>
                  <h3 className={`font-semibold ${colors.text}`} id={columnId}>
                    {status} ({statusItems.length})
                  </h3>
                </div>
                <div className="space-y-2" role="list" aria-labelledby={columnId}>
                  {statusItems.length === 0 ? (
                    <div
                      className="text-center text-gray-400 text-sm py-4"
                      role="status"
                      aria-label={`${status} column is empty`}
                    >
                      No items
                    </div>
                  ) : (
                    statusItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedItem(item.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedItemId === item.id}
                        aria-label={`${item.title}, ${item.type}${item.priority ? `, priority ${item.priority}` : ''}`}
                        className={`bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          selectedItemId === item.id
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-800 mb-1">{item.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{item.type}</span>
                          {item.priority && (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded font-medium">
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

KanbanView.displayName = 'KanbanView';

export default KanbanView;
