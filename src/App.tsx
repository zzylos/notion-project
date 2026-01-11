import { useState, useMemo, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import { useNotionData } from './hooks';
import Header from './components/common/Header';
import FilterPanel from './components/filters/FilterPanel';
import TreeView from './components/tree/TreeView';
import DetailPanel from './components/common/DetailPanel';
import NotionConfigModal from './components/common/NotionConfigModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getMergedConfig } from './utils/config';

// Lazy load heavy view components
const CanvasView = lazy(() => import('./components/canvas/CanvasView'));
const KanbanView = lazy(() => import('./components/views/KanbanView'));

function App() {
  const { setSelectedItem, notionConfig, isLoading, viewMode, selectedItemId } = useStore();

  // Merge environment config with stored config
  const effectiveConfig = useMemo(() => getMergedConfig(notionConfig), [notionConfig]);

  // Data loading
  useNotionData(effectiveConfig);

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  // Render the appropriate view based on viewMode
  const renderMainView = () => {
    const lazyFallback = (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );

    switch (viewMode) {
      case 'canvas':
        return (
          <Suspense fallback={lazyFallback}>
            <CanvasView />
          </Suspense>
        );
      case 'kanban':
        return (
          <Suspense fallback={lazyFallback}>
            <KanbanView />
          </Suspense>
        );
      case 'tree':
      default:
        return <TreeView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <Header onOpenSettings={() => setShowSettings(true)} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="h-1 bg-blue-100">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }} />
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Main view container */}
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>{renderMainView()}</ErrorBoundary>
        </div>

        {/* Detail panel - right side */}
        {selectedItemId && (
          <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 overflow-auto">
            <ErrorBoundary>
              <DetailPanel onClose={() => setSelectedItem(null)} />
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <NotionConfigModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
