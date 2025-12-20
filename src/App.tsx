import { useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import StatsOverview from './components/common/StatsOverview';
import TreeView from './components/tree/TreeView';
import CanvasView from './components/canvas/CanvasView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import { sampleData } from './utils/sampleData';
import { notionService } from './services/notionService';
import { PanelRightClose, PanelRight, Calendar } from 'lucide-react';

function App() {
  const {
    setItems,
    setLoading,
    setError,
    setSelectedItem,
    notionConfig,
    isLoading,
    expandAll,
    viewMode,
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data function
  const loadData = useCallback(async (config: typeof notionConfig) => {
    setLoading(true);
    setError(null);

    try {
      if (config && config.apiKey && config.databaseId) {
        // Initialize Notion service and fetch data
        console.log('Loading data from Notion...');
        notionService.initialize(config);
        const items = await notionService.fetchAllItems();
        console.log('Loaded items from Notion:', items.length);
        setItems(items);
      } else {
        // Use sample data
        console.log('Using demo data');
        setItems(sampleData);
        // Expand all nodes for demo
        setTimeout(() => expandAll(), 100);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data from Notion. Using demo data instead.');
      setItems(sampleData);
    } finally {
      setLoading(false);
    }
  }, [setItems, setLoading, setError, expandAll]);

  // Load data on mount and when notionConfig changes
  useEffect(() => {
    loadData(notionConfig);
  }, [notionConfig, loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(notionConfig);
    setIsRefreshing(false);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleConnect = () => {
    // Config is already saved by the modal, the useEffect will trigger reload
  };

  // Render the appropriate view based on viewMode
  const renderMainView = () => {
    switch (viewMode) {
      case 'canvas':
        return <CanvasView onNodeSelect={() => setShowDetailPanel(true)} />;
      case 'kanban':
        return <KanbanPlaceholder />;
      case 'list':
        return <ListPlaceholder />;
      case 'timeline':
        return <TimelinePlaceholder />;
      case 'tree':
      default:
        return <TreeView onNodeSelect={() => setShowDetailPanel(true)} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-notion">
      {/* Header */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || isLoading}
      />

      {/* Stats Overview */}
      <StatsOverview />

      {/* Filter Panel */}
      <FilterPanel />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main view */}
        <div className="flex-1 overflow-hidden">
          {renderMainView()}
        </div>

        {/* Detail panel toggle button (mobile) */}
        <button
          onClick={() => setShowDetailPanel(!showDetailPanel)}
          className="fixed bottom-4 right-4 z-40 lg:hidden p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          {showDetailPanel ? (
            <PanelRightClose className="w-5 h-5" />
          ) : (
            <PanelRight className="w-5 h-5" />
          )}
        </button>

        {/* Detail panel */}
        <div
          className={`
            fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-gray-200 shadow-xl
            transform transition-transform duration-300 ease-out
            lg:relative lg:transform-none lg:shadow-none lg:z-0
            ${showDetailPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:hidden'}
          `}
        >
          {/* Panel header for mobile */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Item Details</span>
            <button
              onClick={() => setShowDetailPanel(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <PanelRightClose className="w-5 h-5" />
            </button>
          </div>
          <DetailPanel onClose={handleCloseDetail} />
        </div>
      </div>

      {/* Notion Config Modal */}
      <NotionConfigModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConnect={handleConnect}
      />
    </div>
  );
}

// Placeholder components for other views
const KanbanPlaceholder = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems();

  const statuses = ['not-started', 'in-progress', 'blocked', 'in-review', 'completed'] as const;
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

const ListPlaceholder = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems();

  const statusColors: Record<string, string> = {
    'not-started': 'bg-slate-400',
    'in-progress': 'bg-blue-500',
    'blocked': 'bg-red-500',
    'in-review': 'bg-amber-500',
    'completed': 'bg-green-500',
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-gray-50 cursor-pointer ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
              onClick={() => setSelectedItem(item.id)}
            >
              <td className="px-4 py-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[item.status]}`} />
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.title}</td>
              <td className="px-4 py-3 text-sm text-gray-600 capitalize">{item.type}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.priority || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.owner?.name || '-'}</td>
              <td className="px-4 py-3">
                {item.progress !== undefined ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TimelinePlaceholder = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const items = getFilteredItems().filter((item) => item.dueDate);

  // Sort by due date
  const sortedItems = [...items].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const statusColors: Record<string, string> = {
    'not-started': 'bg-slate-400',
    'in-progress': 'bg-blue-500',
    'blocked': 'bg-red-500',
    'in-review': 'bg-amber-500',
    'completed': 'bg-green-500',
  };

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
              const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed';
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 pl-1 cursor-pointer"
                  onClick={() => setSelectedItem(item.id)}
                >
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${statusColors[item.status]} ring-4 ring-white z-10`} />
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

export default App;
