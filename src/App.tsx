import { useState, useMemo, useRef, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import { useNotionData, useFullscreen } from './hooks';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import TreeView from './components/tree/TreeView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingState from './components/ui/LoadingState';
import {
  LoadingProgressBar,
  FailedDatabasesWarning,
  StatsToggle,
} from './components/common/StatusIndicators';
import { getMergedConfig } from './utils/config';
import {
  PanelRightClose,
  PanelRight,
  ChevronDown,
  ChevronUp,
  Maximize,
  Minimize,
} from 'lucide-react';

// Lazy load heavy view components for better initial load performance
const CanvasView = lazy(() => import('./components/canvas/CanvasView'));
const KanbanView = lazy(() => import('./components/views/KanbanView'));
const TimelineView = lazy(() => import('./components/views/TimelineView'));

function App() {
  const { setSelectedItem, notionConfig, isLoading, viewMode } = useStore();

  // Merge environment config with stored config (env takes precedence)
  const effectiveConfig = useMemo(() => getMergedConfig(notionConfig), [notionConfig]);

  // Use custom hook for data loading
  const { loadingProgress, failedDatabases, clearFailedDatabases } =
    useNotionData(effectiveConfig);

  // Fullscreen support for the main content area
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(mainContentRef);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [modalKey, setModalKey] = useState(0);

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleConnect = () => {
    // Config is already saved by the modal, the useEffect in useNotionData will trigger reload
  };

  // Render the appropriate view based on viewMode
  const renderMainView = () => {
    const lazyFallback = <LoadingState message="Loading view..." size="lg" className="h-64" />;

    switch (viewMode) {
      case 'canvas':
        return (
          <Suspense fallback={lazyFallback}>
            <CanvasView onNodeSelect={() => setShowDetailPanel(true)} />
          </Suspense>
        );
      case 'kanban':
        return (
          <Suspense fallback={lazyFallback}>
            <KanbanView />
          </Suspense>
        );
      case 'timeline':
        return (
          <Suspense fallback={lazyFallback}>
            <TimelineView />
          </Suspense>
        );
      case 'tree':
      default:
        return <TreeView onNodeSelect={() => setShowDetailPanel(true)} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-notion overflow-hidden">
      {/* Sticky header section */}
      <div className="sticky top-0 z-20 bg-gray-50">
        {/* Header */}
        <Header
          onOpenSettings={() => {
            setModalKey(k => k + 1);
            setShowSettings(true);
          }}
        />

        {/* Loading Progress Bar */}
        {isLoading && <LoadingProgressBar progress={loadingProgress} />}

        {/* Failed Databases Warning */}
        {failedDatabases && failedDatabases.length > 0 && !isLoading && (
          <FailedDatabasesWarning databases={failedDatabases} onDismiss={clearFailedDatabases} />
        )}

        {/* Stats Overview - Collapsible */}
        <StatsToggle isOpen={showStats} onToggle={() => setShowStats(!showStats)} />

        {/* Filter Panel - Collapsible */}
        <div className="border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {showFilters && <FilterPanel />}
        </div>
      </div>

      {/* Main content area - flex row with main view and detail panel side by side */}
      <div ref={mainContentRef} className="flex-1 flex min-h-0 bg-gray-50">
        {/* Main view container - scrolls independently, takes remaining width */}
        <div className="flex-1 overflow-auto relative">
          <ErrorBoundary>{renderMainView()}</ErrorBoundary>

          {/* Fullscreen toggle button - shown for non-canvas views (canvas has its own) */}
          {viewMode !== 'canvas' && (
            <button
              onClick={toggleFullscreen}
              className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          )}
        </div>

        {/* Detail panel toggle button (mobile only) */}
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

        {/* Mobile: Slide-in overlay panel */}
        <div
          className={`
            fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-gray-200 shadow-xl
            transform transition-transform duration-300 ease-out
            lg:hidden
            ${showDetailPanel ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Item Details</span>
            <button
              onClick={() => setShowDetailPanel(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <PanelRightClose className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[calc(100%-49px)] overflow-auto">
            <ErrorBoundary
              fallback={
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <div className="text-gray-500">
                    <p className="font-medium">Failed to load item details</p>
                    <p className="text-sm mt-1">Try selecting a different item</p>
                  </div>
                </div>
              }
            >
              <DetailPanel onClose={handleCloseDetail} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Desktop: Static flex child - scrolls independently from main view */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 bg-white border-l border-gray-200 overflow-auto">
          <ErrorBoundary
            fallback={
              <div className="h-full flex items-center justify-center p-8 text-center">
                <div className="text-gray-500">
                  <p className="font-medium">Failed to load item details</p>
                  <p className="text-sm mt-1">Try selecting a different item</p>
                </div>
              </div>
            }
          >
            <DetailPanel onClose={handleCloseDetail} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Notion Config Modal */}
      <NotionConfigModal
        key={modalKey}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConnect={handleConnect}
      />
    </div>
  );
}

export default App;
