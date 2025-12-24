import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { WorkItem, Owner } from '../../types';
import {
  getStatusColors,
  getStatusCategory,
  typeColors,
  typeLabels,
  getProgressColor,
} from '../../utils/colors';
import { typeIcons } from '../../utils/icons';

interface CanvasNodeProps {
  data: {
    item: WorkItem;
    isSelected: boolean;
    isConnected?: boolean;
    isDimmed?: boolean;
  };
}

// Sub-components to reduce main component complexity
const NodeProgress: React.FC<{ progress: number }> = memo(({ progress }) => (
  <div className="mb-2">
    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
      <span>Progress</span>
      <span>{progress}%</span>
    </div>
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
));
NodeProgress.displayName = 'NodeProgress';

const NodeOwner: React.FC<{ owner: Owner }> = memo(({ owner }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
      {owner.name?.charAt(0)?.toUpperCase() || '?'}
    </div>
    <span className="text-[10px] text-gray-500 truncate">{owner.name}</span>
  </div>
));
NodeOwner.displayName = 'NodeOwner';

const NodeTags: React.FC<{ tags: string[] }> = memo(({ tags }) => (
  <div className="flex flex-wrap gap-1 mt-2">
    {tags.slice(0, 3).map(tag => (
      <span key={tag} className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded">
        {tag}
      </span>
    ))}
    {tags.length > 3 && <span className="text-[9px] text-gray-400">+{tags.length - 3}</span>}
  </div>
));
NodeTags.displayName = 'NodeTags';

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ data }) => {
  const { item, isSelected, isDimmed = false } = data;
  const TypeIcon = typeIcons[item.type];
  const statusStyle = getStatusColors(item.status);
  const typeStyle = typeColors[item.type];
  const isInProgress = getStatusCategory(item.status) === 'in-progress';

  return (
    <div
      className={`
        rounded-lg shadow-md border-2 transition-all duration-200
        cursor-pointer
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
        ${isDimmed ? 'opacity-25 hover:opacity-50' : 'bg-white hover:shadow-lg'}
      `}
      style={{
        minWidth: 220,
        maxWidth: 280,
        backgroundColor: isDimmed ? 'rgb(249 250 251)' : 'white',
      }}
    >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Header with type indicator */}
      <div className={`px-3 py-2 rounded-t-md ${typeStyle.bg} border-b ${typeStyle.border}`}>
        <div className="flex items-center gap-2">
          <TypeIcon className={`w-4 h-4 ${typeStyle.icon}`} />
          <span className={`text-xs font-semibold ${typeStyle.text}`}>{typeLabels[item.type]}</span>
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
            ${getStatusCategory(item.status) === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}
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
            {item.status}
          </span>
        </div>

        {/* Progress bar */}
        {item.progress !== undefined && <NodeProgress progress={item.progress} />}

        {/* Owner */}
        {item.owner && <NodeOwner owner={item.owner} />}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && <NodeTags tags={item.tags} />}
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
