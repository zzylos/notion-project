import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { WorkItem } from '../../types';
import { getStatusColors, typeColors, typeLabels } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';

interface CanvasNodeProps {
  data: {
    item: WorkItem;
    isSelected: boolean;
  };
}

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ data }) => {
  const { item, isSelected } = data;
  const TypeIcon = typeIcons[item.type];
  const statusStyle = getStatusColors(item.status);
  const typeStyle = typeColors[item.type];

  return (
    <div
      className={`rounded-lg shadow-md border-2 bg-white cursor-pointer hover:shadow-lg ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      style={{ minWidth: 220, maxWidth: 280 }}
    >
      {/* Top handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400 border-2 border-white" />

      {/* Header */}
      <div className={`px-3 py-2 rounded-t-md ${typeStyle.bg} border-b ${typeStyle.border}`}>
        <div className="flex items-center gap-2">
          <TypeIcon className={`w-4 h-4 ${typeStyle.icon}`} />
          <span className={`text-xs font-semibold ${typeStyle.text}`}>{typeLabels[item.type]}</span>
          {item.priority && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-white/50 rounded">{item.priority}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-medium leading-tight mb-2 line-clamp-2 text-gray-800">{item.title}</h3>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {item.status}
        </span>

        {/* Owner */}
        {item.owner && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
              {item.owner.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-[10px] text-gray-500 truncate">{item.owner.name}</span>
          </div>
        )}
      </div>

      {/* Bottom handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400 border-2 border-white" />
    </div>
  );
});

CanvasNode.displayName = 'CanvasNode';

export default CanvasNode;
