import { Panel } from '@xyflow/react';
import { RotateCcw, Maximize, Minimize } from 'lucide-react';

interface CanvasControlsProps {
  /** Called when the user clicks the reset layout button */
  onResetLayout: () => void;
  /** Called when the user clicks the fullscreen toggle button */
  onToggleFullscreen: () => void;
  /** Whether the canvas is currently in fullscreen mode */
  isFullscreen: boolean;
}

/**
 * CanvasControls provides action buttons for the canvas view,
 * including layout reset and fullscreen toggle functionality.
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  onResetLayout,
  onToggleFullscreen,
  isFullscreen,
}) => {
  return (
    <Panel position="top-right" className="flex gap-2">
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
