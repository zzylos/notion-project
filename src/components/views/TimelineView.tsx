import { Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getStatusColors, getStatusCategory } from '../../utils/colors';

const TimelineView: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems().filter((item) => item.dueDate);

  // Sort by due date
  const sortedItems = [...items].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-gray-500">
        <Calendar className="w-5 h-5" />
        <span className="text-sm">Timeline View - Items with due dates</span>
      </div>
      {sortedItems.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No items with due dates found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {sortedItems.map((item) => {
              const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && getStatusCategory(item.status) !== 'completed';
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 pl-1 cursor-pointer"
                  onClick={() => setSelectedItem(item.id)}
                >
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColors(item.status).dot} ring-4 ring-white z-10`} />
                  <div className={`flex-1 bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow ${
                    selectedItemId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{item.title}</span>
                      <span className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                        {item.dueDate && new Date(item.dueDate).toLocaleDateString()}
                        {isOverdue && ' (OVERDUE)'}
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
  );
};

export default TimelineView;
