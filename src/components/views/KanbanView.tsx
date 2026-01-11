import { useMemo, memo } from 'react';
import { useStore } from '../../store/useStore';
import { getStatusColors, getUniqueStatuses } from '../../utils/colors';

const KanbanView: React.FC = memo(() => {
  const { getFilteredItems, setSelectedItem, selectedItemId, items: allItems, isLoading } = useStore();
  const filteredItems = getFilteredItems();

  // Get unique statuses from all items
  const statuses = useMemo(() => getUniqueStatuses(allItems.values()), [allItems]);

  // Group items by status
  const statusItemsMap = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const status of statuses) {
      map.set(status, filteredItems.filter(item => item.status === status));
    }
    return map;
  }, [statuses, filteredItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No items found</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex gap-4 min-w-max">
        {statuses.map(status => {
          const statusItems = statusItemsMap.get(status) || [];
          const colors = getStatusColors(status);

          return (
            <div key={status} className="w-72 flex-shrink-0">
              {/* Column header */}
              <div className={`rounded-lg border ${colors.bg} ${colors.border} p-3 mb-3`}>
                <h3 className={`font-semibold ${colors.text}`}>
                  {status} ({statusItems.length})
                </h3>
              </div>

              {/* Column items */}
              <div className="space-y-2">
                {statusItems.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">No items</div>
                ) : (
                  statusItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      className={`bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                        selectedItemId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-800 mb-1">{item.title}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{item.type}</span>
                        {item.priority && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded font-medium">{item.priority}</span>
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
});

KanbanView.displayName = 'KanbanView';

export default KanbanView;
