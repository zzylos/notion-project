import { Panel } from '@xyflow/react';
import { typeHexColors } from '../../utils/colors';

/**
 * CanvasLegend displays a legend panel showing the color coding for
 * different item types and relationship types in the canvas view.
 */
const CanvasLegend: React.FC = () => {
  return (
    <Panel position="top-left" className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.mission }} />
          <span className="text-xs text-gray-600">Mission</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.problem }} />
          <span className="text-xs text-gray-600">Problem</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.solution }} />
          <span className="text-xs text-gray-600">Solution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.design }} />
          <span className="text-xs text-gray-600">Design</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.project }} />
          <span className="text-xs text-gray-600">Project</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gray-400" />
          <span className="text-xs text-gray-600">Parent → Child</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-400" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-gray-600">Blocked by</span>
        </div>
      </div>
    </Panel>
  );
};

export default CanvasLegend;
