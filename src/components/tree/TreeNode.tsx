import React, { memo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Target,
  AlertCircle,
  Lightbulb,
  Palette,
  FolderKanban,
  ExternalLink,
  Clock,
} from 'lucide-react';
import type { TreeNode as TreeNodeType } from '../../types';
import { statusColors, typeColors, priorityColors, statusLabels, getProgressColor } from '../../utils/colors';
import { useStore } from '../../store/useStore';

interface TreeNodeProps {
  node: TreeNodeType;
  onNodeClick: (id: string) => void;
}

const typeIcons = {
  mission: Target,
  problem: AlertCircle,
  solution: Lightbulb,
  design: Palette,
  project: FolderKanban,
};

const TreeNodeComponent: React.FC<TreeNodeProps> = memo(({ node, onNodeClick }) => {
  const { toggleExpanded, setSelectedItem } = useStore();
  const { item, children, level, isExpanded, isSelected, isHighlighted } = node;

  const TypeIcon = typeIcons[item.type];
  const hasChildren = children.length > 0;
  const indentPx = level * 24;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleExpanded(item.id);
    }
  };

  const handleClick = () => {
    setSelectedItem(item.id);
    onNodeClick(item.id);
  };

  const statusStyle = statusColors[item.status];
  const typeStyle = typeColors[item.type];
  const isInProgress = item.status === 'in-progress';

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition-all duration-150 ease-out
          ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}
          ${isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        `}
        style={{ marginLeft: `${indentPx}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleToggle}
          className={`
            flex items-center justify-center w-5 h-5 rounded
            transition-colors duration-150
            ${hasChildren ? 'hover:bg-gray-200 text-gray-500' : 'text-transparent cursor-default'}
          `}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Status indicator dot */}
        <div
          className={`
            w-2.5 h-2.5 rounded-full flex-shrink-0
            ${statusStyle.dot}
            ${isInProgress ? 'animate-pulse-status' : ''}
          `}
          title={statusLabels[item.status]}
        />

        {/* Type icon */}
        <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeStyle.icon}`} />

        {/* Title */}
        <span
          className={`
            flex-1 text-sm font-medium truncate
            ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'}
          `}
        >
          {item.title}
        </span>

        {/* Priority badge */}
        {item.priority && (
          <span
            className={`
              px-1.5 py-0.5 text-xs font-semibold rounded
              ${priorityColors[item.priority].bg}
              ${priorityColors[item.priority].text}
            `}
          >
            {item.priority}
          </span>
        )}

        {/* Progress bar (for items with progress) */}
        {item.progress !== undefined && item.progress < 100 && (
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(item.progress)}`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}

        {/* Owner avatar */}
        {item.owner && (
          <div
            className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
            title={item.owner.name}
          >
            {item.owner.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Due date indicator */}
        {item.dueDate && (
          <div
            className={`
              flex items-center gap-1 text-xs
              ${new Date(item.dueDate) < new Date() && item.status !== 'completed'
                ? 'text-red-500'
                : 'text-gray-400'}
            `}
            title={`Due: ${new Date(item.dueDate).toLocaleDateString()}`}
          >
            <Clock className="w-3 h-3" />
          </div>
        )}

        {/* External link to Notion */}
        {item.notionUrl && (
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            title="Open in Notion"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute w-px bg-gray-200"
            style={{
              left: `${indentPx + 22}px`,
              top: 0,
              height: '100%',
            }}
          />
          {children.map((child) => (
            <TreeNodeComponent key={child.item.id} node={child} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNodeComponent.displayName = 'TreeNode';

export default TreeNodeComponent;
