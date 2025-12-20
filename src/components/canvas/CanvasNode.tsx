import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Target,
  AlertCircle,
  Lightbulb,
  Palette,
  FolderKanban,
} from 'lucide-react';
import type { WorkItem, ItemType } from '../../types';
import {
  statusColors,
  typeColors,
  statusLabels,
  typeLabels,
  getProgressColor,
} from '../../utils/colors';

interface CanvasNodeProps {
  data: {
    item: WorkItem;
    isSelected: boolean;
  };
}

const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  mission: Target,
  problem: AlertCircle,
  solution: Lightbulb,
  design: Palette,
  project: FolderKanban,
};

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ data }) => {
  const { item, isSelected } = data;
  const TypeIcon = typeIcons[item.type];
  const statusStyle = statusColors[item.status];
  const typeStyle = typeColors[item.type];
  const isInProgress = item.status === 'in-progress';

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md border-2 transition-all duration-200
        hover:shadow-lg cursor-pointer
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
      `}
      style={{
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Header with type indicator */}
      <div
        className={`px-3 py-2 rounded-t-md ${typeStyle.bg} border-b ${typeStyle.border}`}
      >
        <div className="flex items-center gap-2">
          <TypeIcon className={`w-4 h-4 ${typeStyle.icon}`} />
          <span className={`text-xs font-semibold ${typeStyle.text}`}>
            {typeLabels[item.type]}
          </span>
          {item.priority && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-white/50 rounded">
              {item.priority}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3
          className={`
            text-sm font-medium leading-tight mb-2 line-clamp-2
            ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}
          `}
        >
          {item.title}
        </h3>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`
              inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${statusStyle.bg} ${statusStyle.text}
            `}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${
                isInProgress ? 'animate-pulse' : ''
              }`}
            />
            {statusLabels[item.status]}
          </span>
        </div>

        {/* Progress bar */}
        {item.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
              <span>Progress</span>
              <span>{item.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(item.progress)}`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Owner */}
        {item.owner && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
              {item.owner.name.charAt(0)}
            </div>
            <span className="text-[10px] text-gray-500 truncate">
              {item.owner.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] text-gray-400">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
    </div>
  );
});

CanvasNode.displayName = 'CanvasNode';

export default CanvasNode;
