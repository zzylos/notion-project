import { Panel } from '@xyflow/react';
import { RotateCcw, Maximize, Minimize, Eye, EyeOff, Focus } from 'lucide-react';

interface CanvasControlsProps {
  /** Called when the user clicks the reset layout button */
  onResetLayout: () => void;
  /** Called when the user clicks the fullscreen toggle button */
  onToggleFullscreen: () => void;
  /** Whether the canvas is currently in fullscreen mode */
  isFullscreen: boolean;
  /** Whether orphan items (no parent, no children) are hidden */
  hideOrphanItems: boolean;
  /** Called when the user toggles orphan visibility */
  onToggleOrphanItems: () => void;
  /** Count of orphan items being hidden */
  orphanCount: number;
  /** Whether focus mode is enabled (show only connected items) */
  focusMode: boolean;
  /** Called when the user toggles focus mode */
  onToggleFocusMode: () => void;
  /** Whether an item is currently selected */
  hasSelection: boolean;
}

/**
 * CanvasControls provides action buttons for the canvas view,
 * including layout reset, fullscreen toggle, orphan filtering, and focus mode.
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  onResetLayout,
  onToggleFullscreen,
  isFullscreen,
  hideOrphanItems,
  onToggleOrphanItems,
  orphanCount,
  focusMode,
  onToggleFocusMode,
  hasSelection,
}) => {
  return (
    <Panel position="top-right" className="flex gap-2">
      {/* Focus mode toggle - highlight connected items */}
      <button
        onClick={onToggleFocusMode}
        disabled={!hasSelection}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm transition-colors
          ${
            !hasSelection
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : focusMode
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }
        `}
        title={
          !hasSelection
            ? 'Select an item to enable focus mode'
            : focusMode
              ? 'Disable focus mode'
              : 'Focus mode: Highlight connected items (parent, children, siblings)'
        }
        aria-label={focusMode ? 'Disable focus mode' : 'Enable focus mode'}
        aria-pressed={focusMode}
      >
        <Focus size={16} />
        {focusMode ? 'Focus On' : 'Focus'}
      </button>

      {/* Orphan items toggle */}
      <button
        onClick={onToggleOrphanItems}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm transition-colors
          ${
            hideOrphanItems
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }
        `}
        title={
          hideOrphanItems ? 'Show orphan items' : 'Hide orphan items (items with no connections)'
        }
        aria-label={hideOrphanItems ? 'Show orphan items' : 'Hide orphan items'}
        aria-pressed={hideOrphanItems}
      >
        {hideOrphanItems ? <EyeOff size={16} /> : <Eye size={16} />}
        {hideOrphanItems ? `Hidden: ${orphanCount}` : 'Hide Orphans'}
      </button>

      <button
        onClick={onResetLayout}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        title="Reset layout to original positions"
        aria-label="Reset layout to original positions"
      >
        <RotateCcw size={16} />
        Reset Layout
      </button>
      <button
        onClick={onToggleFullscreen}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        {isFullscreen ? 'Exit' : 'Fullscreen'}
      </button>
    </Panel>
  );
};

export default CanvasControls;
