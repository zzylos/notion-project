import { Panel } from '@xyflow/react';
import { RotateCcw, Maximize, Minimize, Focus } from 'lucide-react';

interface CanvasControlsProps {
  /** Called when the user clicks the reset layout button */
  onResetLayout: () => void;
  /** Called when the user clicks the fullscreen toggle button */
  onToggleFullscreen: () => void;
  /** Whether the canvas is currently in fullscreen mode */
  isFullscreen: boolean;
  /** Whether focus mode is enabled (show only connected items) */
  focusMode: boolean;
  /** Called when the user toggles focus mode */
  onToggleFocusMode: () => void;
  /** Whether an item is currently selected */
  hasSelection: boolean;
}

const baseButtonClass =
  'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm transition-colors';

function getFocusButtonStyles(hasSelection: boolean, focusMode: boolean): string {
  if (!hasSelection) return 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed';
  if (focusMode) return 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200';
  return 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
}

function getFocusButtonTitle(hasSelection: boolean, focusMode: boolean): string {
  if (!hasSelection) return 'Select an item to enable focus mode';
  if (focusMode) return 'Disable focus mode';
  return 'Focus mode: Highlight connected items (parent, children, siblings)';
}

/**
 * CanvasControls provides action buttons for the canvas view,
 * including layout reset, fullscreen toggle, and focus mode.
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  onResetLayout,
  onToggleFullscreen,
  isFullscreen,
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
        className={`${baseButtonClass} ${getFocusButtonStyles(hasSelection, focusMode)}`}
        title={getFocusButtonTitle(hasSelection, focusMode)}
        aria-label={focusMode ? 'Disable focus mode' : 'Enable focus mode'}
        aria-pressed={focusMode}
      >
        <Focus size={16} />
        {focusMode ? 'Focus On' : 'Focus'}
      </button>

      <button
        onClick={onResetLayout}
        className={`${baseButtonClass} bg-white border-gray-200 text-gray-700 hover:bg-gray-50`}
        title="Reset layout to original positions"
        aria-label="Reset layout to original positions"
      >
        <RotateCcw size={16} />
        Reset Layout
      </button>
      <button
        onClick={onToggleFullscreen}
        className={`${baseButtonClass} bg-white border-gray-200 text-gray-700 hover:bg-gray-50`}
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
