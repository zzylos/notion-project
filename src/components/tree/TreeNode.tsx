import { memo, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { TreeNode as TreeNodeType } from '../../types';
import { getStatusColors, typeColors, priorityColors } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import { useStore } from '../../store/useStore';
import { TREE } from '../../constants';

interface TreeNodeProps {
  node: TreeNodeType;
  onNodeClick: (id: string) => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = memo(({ node, onNodeClick }) => {
  const { toggleExpanded, setSelectedItem } = useStore();
  const { item, children, level, isExpanded, isSelected } = node;

  const TypeIcon = typeIcons[item.type];
  const hasChildren = children.length > 0;
  const indentPx = level * TREE.INDENT_PX;
  const statusStyle = getStatusColors(item.status);
  const typeStyle = typeColors[item.type];

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) toggleExpanded(item.id);
    },
    [hasChildren, toggleExpanded, item.id]
  );

  const handleClick = useCallback(() => {
    setSelectedItem(item.id);
    onNodeClick(item.id);
  }, [setSelectedItem, item.id, onNodeClick]);

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
        }`}
        style={{ marginLeft: `${indentPx}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 text-gray-500"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5 h-5" />
        )}

        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusStyle.dot}`} title={item.status} />

        {/* Type icon */}
        <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeStyle.icon}`} />

        {/* Title */}
        <span className="flex-1 text-sm font-medium truncate text-gray-800">{item.title}</span>

        {/* Priority badge */}
        {item.priority && (
          <span
            className={`px-1.5 py-0.5 text-xs font-semibold rounded ${priorityColors[item.priority].bg} ${priorityColors[item.priority].text}`}
          >
            {item.priority}
          </span>
        )}

        {/* Owner avatar */}
        {item.owner && (
          <div
            className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
            title={item.owner.name}
          >
            {item.owner.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <TreeNodeComponent key={child.item.id} node={child} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNodeComponent.displayName = 'TreeNode';

export default TreeNodeComponent;
