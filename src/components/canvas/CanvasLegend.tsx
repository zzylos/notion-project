import { Panel } from '@xyflow/react';
import { typeHexColors } from '../../utils/colors';

/**
 * CanvasLegend displays a legend panel showing the color coding for
 * different item types and relationship types in the canvas view.
 * Uses z-index to ensure visibility over React Flow controls and minimap.
 */
const CanvasLegend: React.FC = () => {
  return (
    <Panel
      position="top-left"
      className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
      style={{ zIndex: 10 }}
    >
      <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded flex-shrink-0"
            style={{ backgroundColor: typeHexColors.mission }}
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">Mission</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded flex-shrink-0"
            style={{ backgroundColor: typeHexColors.problem }}
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">Problem</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded flex-shrink-0"
            style={{ backgroundColor: typeHexColors.solution }}
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">Solution</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded flex-shrink-0"
            style={{ backgroundColor: typeHexColors.design }}
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">Design</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded flex-shrink-0"
            style={{ backgroundColor: typeHexColors.project }}
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">Project</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-600 whitespace-nowrap">Parent → Child</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-400 flex-shrink-0 border-dashed border-t border-red-400" />
          <span className="text-xs text-gray-600 whitespace-nowrap">Blocked by</span>
        </div>
      </div>
    </Panel>
  );
};

export default CanvasLegend;
