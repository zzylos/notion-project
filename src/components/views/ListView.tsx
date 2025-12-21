import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../../store/useStore';

const statusColors: Record<string, string> = {
  'not-started': 'bg-slate-400',
  'in-progress': 'bg-blue-500',
  'blocked': 'bg-red-500',
  'in-review': 'bg-amber-500',
  'completed': 'bg-green-500',
};

const ListView: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems();
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualize rows for large datasets
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 10, // Render extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-[48px_1fr_100px_80px_120px_120px] px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 uppercase">Status</div>
          <div className="text-xs font-semibold text-gray-500 uppercase">Title</div>
          <div className="text-xs font-semibold text-gray-500 uppercase">Type</div>
          <div className="text-xs font-semibold text-gray-500 uppercase">Priority</div>
          <div className="text-xs font-semibold text-gray-500 uppercase">Owner</div>
          <div className="text-xs font-semibold text-gray-500 uppercase">Progress</div>
        </div>
      </div>

      {/* Virtualized rows */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={`grid grid-cols-[48px_1fr_100px_80px_120px_120px] px-4 items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                selectedItemId === item.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedItem(item.id)}
            >
              <div>
                <div className={`w-3 h-3 rounded-full ${statusColors[item.status]}`} />
              </div>
              <div className="text-sm font-medium text-gray-800 truncate pr-2">{item.title}</div>
              <div className="text-sm text-gray-600 capitalize">{item.type}</div>
              <div className="text-sm text-gray-600">{item.priority || '-'}</div>
              <div className="text-sm text-gray-600 truncate">{item.owner?.name || '-'}</div>
              <div>
                {item.progress !== undefined ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{item.progress}%</span>
                  </div>
                ) : (
                  '-'
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item count footer */}
      {items.length > 100 && (
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          Showing {items.length} items (virtualized for performance)
        </div>
      )}
    </div>
  );
};

export default ListView;
