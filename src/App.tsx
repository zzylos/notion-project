import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from './store/useStore';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import StatsOverview from './components/common/StatsOverview';
import TreeView from './components/tree/TreeView';
import CanvasView from './components/canvas/CanvasView';
import KanbanView from './components/views/KanbanView';
import ListView from './components/views/ListView';
import TimelineView from './components/views/TimelineView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import { sampleData } from './utils/sampleData';
import { notionService } from './services/notionService';
import { PanelRightClose, PanelRight, Loader2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';

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
  const [showStats, setShowStats] = useState(false); // Collapsed by default
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number | null } | null>(null);
  const [failedDatabases, setFailedDatabases] = useState<Array<{ type: string; error: string }> | null>(null);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load data function with progressive updates
  const loadData = useCallback(async (config: typeof notionConfig, forceRefresh = false) => {
    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setLoadingProgress(null);
    setFailedDatabases(null);

    try {
      if (config && config.apiKey && config.databaseId) {
        // Clear cache if force refresh
        if (forceRefresh) {
          notionService.clearCache();
        }

        // Initialize Notion service and fetch data with progress
        notionService.initialize(config);

        const items = await notionService.fetchAllItems({
          signal: abortController.signal,
          onProgress: (progress) => {
            // Don't update state if aborted
            if (abortController.signal.aborted) return;

            setLoadingProgress({ loaded: progress.loaded, total: progress.total });

            // Track failed databases
            if (progress.failedDatabases && progress.failedDatabases.length > 0) {
              setFailedDatabases(progress.failedDatabases);
            }

            // Update items progressively for faster perceived performance
            if (progress.items.length > 0 && !progress.done) {
              setItems(progress.items);
            }
          },
        });

        // Don't update state if aborted
        if (abortController.signal.aborted) return;

        setItems(items);
      } else {
        // Use sample data
        setItems(sampleData);
        // Expand all nodes for demo (clear any existing timeout first)
        if (expandTimeoutRef.current) {
          clearTimeout(expandTimeoutRef.current);
        }
        expandTimeoutRef.current = setTimeout(() => expandAll(), 100);
      }
    } catch (error) {
      // Ignore abort errors - they're expected when canceling
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setError('Failed to load data from Notion. Using demo data instead.');
      setItems(sampleData);
    } finally {
      // Only update loading state if this is still the current request
      if (abortControllerRef.current === abortController) {
        setLoading(false);
        setLoadingProgress(null);
      }
    }
  }, [setItems, setLoading, setError, expandAll]);

  // Load data on mount and when notionConfig changes
  useEffect(() => {
    loadData(notionConfig);
  }, [notionConfig, loadData]);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(notionConfig, true); // Force refresh, bypass cache
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
        return <KanbanView />;
      case 'list':
        return <ListView />;
      case 'timeline':
        return <TimelineView />;
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

      {/* Loading Progress Bar */}
      {isLoading && loadingProgress && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">
              Loading items from Notion... {loadingProgress.loaded} items loaded
              {loadingProgress.total && ` of ~${loadingProgress.total}`}
            </span>
          </div>
          <div className="mt-1 w-full h-1 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: loadingProgress.total
                  ? `${Math.min(100, (loadingProgress.loaded / loadingProgress.total) * 100)}%`
                  : '100%',
                animation: loadingProgress.total ? 'none' : 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Failed Databases Warning */}
      {failedDatabases && failedDatabases.length > 0 && !isLoading && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-amber-800">
                Some databases failed to load
              </span>
              <ul className="mt-1 text-xs text-amber-700">
                {failedDatabases.map((db, i) => (
                  <li key={i}>
                    <span className="font-medium capitalize">{db.type}</span>: {db.error}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setFailedDatabases(null)}
              className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview - Collapsible */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">Statistics Overview</span>
          {showStats ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {showStats && <StatsOverview />}
      </div>

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

export default App;
