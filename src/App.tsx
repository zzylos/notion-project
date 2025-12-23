import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import StatsOverview from './components/common/StatsOverview';
import TreeView from './components/tree/TreeView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingState from './components/ui/LoadingState';
import { sampleData } from './utils/sampleData';
import { notionService } from './services/notionService';
import { getMergedConfig, hasEnvConfig } from './utils/config';
import {
  PanelRightClose,
  PanelRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  FileCode,
} from 'lucide-react';
import type { NotionConfig } from './types';

// Lazy load heavy view components for better initial load performance
const CanvasView = lazy(() => import('./components/canvas/CanvasView'));
const KanbanView = lazy(() => import('./components/views/KanbanView'));
const ListView = lazy(() => import('./components/views/ListView'));
const TimelineView = lazy(() => import('./components/views/TimelineView'));

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
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number | null;
  } | null>(null);
  const [failedDatabases, setFailedDatabases] = useState<Array<{
    type: string;
    error: string;
  }> | null>(null);
  // Counter to force modal remount when opening (resets form state)
  const [modalKey, setModalKey] = useState(0);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Merge environment config with stored config (env takes precedence)
  const effectiveConfig = useMemo(() => getMergedConfig(notionConfig), [notionConfig]);
  const usingEnvConfig = hasEnvConfig();

  // Load data function with progressive updates
  const loadData = useCallback(
    async (config: NotionConfig | null, forceRefresh = false) => {
      // Cancel any previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);
      // Set initial progress immediately so progress bar shows up right away
      setLoadingProgress({ loaded: 0, total: null });
      setFailedDatabases(null);

      try {
        // Check for valid config - support both legacy databaseId and new databases array
        const hasValidConfig =
          config &&
          config.apiKey &&
          (config.databaseId || (config.databases && config.databases.length > 0));

        if (hasValidConfig) {
          // Clear cache if force refresh
          if (forceRefresh) {
            notionService.clearCache();
          }

          // Initialize Notion service and fetch data with progress
          notionService.initialize(config);

          const items = await notionService.fetchAllItems({
            signal: abortController.signal,
            onProgress: progress => {
              // Don't update state if aborted
              if (abortController.signal.aborted) return;

              try {
                setLoadingProgress({ loaded: progress.loaded, total: progress.total });

                // Track failed databases
                if (progress.failedDatabases && progress.failedDatabases.length > 0) {
                  setFailedDatabases(progress.failedDatabases);
                }

                // Update items progressively for faster perceived performance
                if (progress.items.length > 0 && !progress.done) {
                  setItems(progress.items);
                }
              } catch (e) {
                console.error('Error in progress callback:', e);
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to load data from Notion:', error);
        setError(`Failed to load data from Notion: ${errorMessage}. Using demo data instead.`);
        setItems(sampleData);
      } finally {
        // Only update loading state if this is still the current request
        if (abortControllerRef.current === abortController) {
          setLoading(false);
          setLoadingProgress(null);
        }
      }
    },
    [setItems, setLoading, setError, expandAll]
  );

  // Load data on mount and when config changes
  useEffect(() => {
    loadData(effectiveConfig);
  }, [effectiveConfig, loadData]);

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
    await loadData(effectiveConfig, true); // Force refresh, bypass cache
    setIsRefreshing(false);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleConnect = () => {
    // Config is already saved by the modal, the useEffect will trigger reload
  };

  // Render the appropriate view based on viewMode
  // Lazy loaded views are wrapped in Suspense with a loading fallback
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
      case 'list':
        return (
          <Suspense fallback={lazyFallback}>
            <ListView />
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
        // TreeView is not lazy loaded as it's the default view
        return <TreeView onNodeSelect={() => setShowDetailPanel(true)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-notion">
      {/* Sticky header section */}
      <div className="sticky top-0 z-20 bg-gray-50">
        {/* Header */}
        <Header
          onOpenSettings={() => {
            setModalKey(k => k + 1); // Force modal remount to reset form state
            setShowSettings(true);
          }}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || isLoading}
        />

        {/* Environment config indicator */}
        {usingEnvConfig && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-1.5">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <FileCode className="w-3.5 h-3.5" />
              <span>
                Using configuration from{' '}
                <code className="px-1 py-0.5 bg-green-100 rounded">.env</code> file
              </span>
            </div>
          </div>
        )}

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
        <div className="border-b border-gray-200 bg-white">
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
      </div>

      {/* Main content area - scrollable with minimum height */}
      <div className="flex-1 flex min-h-[500px]">
        {/* Main view - with minimum height for canvas usability */}
        <div className="flex-1 overflow-auto min-h-[500px]">
          <ErrorBoundary>{renderMainView()}</ErrorBoundary>
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

      {/* Notion Config Modal - key forces remount to reset form state when opening */}
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
