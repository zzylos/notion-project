import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { getStatusColors } from '../../utils/colors';

const KanbanView: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId, items: allItems } = useStore();
  const filteredItems = getFilteredItems();

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

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex gap-4 min-w-max">
        {statuses.map((status) => {
          const statusItems = filteredItems.filter((item) => item.status === status);
          const colors = getStatusColors(status);

          return (
            <div key={status} className="w-72 flex-shrink-0">
              <div className={`rounded-lg border ${colors.bg} ${colors.border} p-3 mb-3`}>
                <h3 className={`font-semibold ${colors.text}`}>
                  {status} ({statusItems.length})
                </h3>
              </div>
              <div className="space-y-2">
                {statusItems.map((item) => (
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
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded font-medium">
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanView;
