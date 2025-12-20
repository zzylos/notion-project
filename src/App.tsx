import { useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import StatsOverview from './components/common/StatsOverview';
import TreeView from './components/tree/TreeView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import { sampleData } from './utils/sampleData';
import { notionService } from './services/notionService';
import { PanelRightClose, PanelRight } from 'lucide-react';

function App() {
  const {
    setItems,
    setLoading,
    setError,
    setSelectedItem,
    notionConfig,
    isLoading,
    expandAll,
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (notionConfig) {
        // Initialize Notion service and fetch data
        notionService.initialize(notionConfig);
        const items = await notionService.fetchAllItems();
        setItems(items);
      } else {
        // Use sample data
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
      setIsInitialized(true);
    }
  }, [notionConfig, setItems, setLoading, setError, expandAll]);

  useEffect(() => {
    if (!isInitialized) {
      loadData();
    }
  }, [loadData, isInitialized]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleConnect = () => {
    setIsInitialized(false);
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
        {/* Tree view */}
        <div className="flex-1 overflow-hidden">
          <TreeView onNodeSelect={() => setShowDetailPanel(true)} />
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

export default App;
