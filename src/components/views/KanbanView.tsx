import { useMemo, useState, useCallback } from 'react';
import { Search, EyeOff, Eye, Columns } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getStatusColors } from '../../utils/colors';

const KanbanView: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId, items: allItems, isLoading } = useStore();
  const filteredItems = getFilteredItems();
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  // Get unique statuses from all items, preserving order of first occurrence
  const statuses = useMemo(() => {
    const statusSet = new Set<string>();
    const statusOrder: string[] = [];

    // Get statuses from all items to maintain consistent columns
    Array.from(allItems.values()).forEach((item) => {
      if (!statusSet.has(item.status)) {
        statusSet.add(item.status);
        statusOrder.push(item.status);
      }
    });

    return statusOrder;
  }, [allItems]);

  // Pre-compute status items to avoid repeated filtering
  const statusItemsMap = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const status of statuses) {
      map.set(status, filteredItems.filter((item) => item.status === status));
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
    return (
      <div className="flex items-center justify-center h-64">
        <Columns className="w-8 h-8 text-blue-500 animate-pulse" />
        <span className="ml-3 text-gray-600">Loading board...</span>
      </div>
    );
  }

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Search className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4" role="region" aria-label="Kanban board">
      {/* Controls */}
      {emptyColumnCount > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={toggleHideEmpty}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
              ${hideEmptyColumns
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
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
              <div
                className="space-y-2"
                role="list"
                aria-labelledby={columnId}
              >
                {statusItems.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No items
                  </div>
                ) : (
                  statusItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      onKeyDown={(e) => {
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
                        selectedItemId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
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
  );
};

export default KanbanView;
