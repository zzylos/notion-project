import { useStore } from '../../store/useStore';

const statusLabels: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'blocked': 'Blocked',
  'in-review': 'In Review',
  'completed': 'Completed',
};

const statusColors: Record<string, string> = {
  'not-started': 'bg-slate-100 border-slate-300',
  'in-progress': 'bg-blue-100 border-blue-300',
  'blocked': 'bg-red-100 border-red-300',
  'in-review': 'bg-amber-100 border-amber-300',
  'completed': 'bg-green-100 border-green-300',
};

const statuses = ['not-started', 'in-progress', 'blocked', 'in-review', 'completed'] as const;

const KanbanView: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems();

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex gap-4 min-w-max">
        {statuses.map((status) => {
          const statusItems = items.filter((item) => item.status === status);
          return (
            <div key={status} className="w-72 flex-shrink-0">
              <div className={`rounded-lg border ${statusColors[status]} p-3 mb-3`}>
                <h3 className="font-semibold text-gray-800">
                  {statusLabels[status]} ({statusItems.length})
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
