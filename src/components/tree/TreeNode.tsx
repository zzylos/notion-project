import React, { memo, useCallback } from 'react';
import { ChevronRight, ChevronDown, ExternalLink, Clock } from 'lucide-react';
import type { TreeNode as TreeNodeType, WorkItem } from '../../types';
import {
  getStatusColors,
  getStatusCategory,
  typeColors,
  priorityColors,
  getProgressColor,
} from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import { useStore } from '../../store/useStore';
import { TREE } from '../../constants';
import { isOverdue, formatDate } from '../../utils/dateUtils';
import { isValidNotionUrl } from '../../utils/validation';

interface TreeNodeProps {
  node: TreeNodeType;
  onNodeClick: (id: string) => void;
}

function getRowClassName(isSelected: boolean, isHighlighted: boolean): string {
  const base =
    'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
  const selectionClass = isSelected
    ? 'bg-blue-50 border border-blue-200'
    : 'hover:bg-gray-50 border border-transparent';
  const highlightClass = isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1' : '';
  return `${base} ${selectionClass} ${highlightClass}`;
}

interface NodeMetadataProps {
  item: WorkItem;
}

const NodeMetadata: React.FC<NodeMetadataProps> = memo(({ item }) => {
  const showProgress = item.progress !== undefined && item.progress < 100;
  const showDueDate = Boolean(item.dueDate);
  const showNotionLink = item.notionUrl && isValidNotionUrl(item.notionUrl);

  return (
    <>
      {item.priority && (
        <span
          className={`px-1.5 py-0.5 text-xs font-semibold rounded ${priorityColors[item.priority].bg} ${priorityColors[item.priority].text}`}
        >
          {item.priority}
        </span>
      )}
      {showProgress && (
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(item.progress!)}`}
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
      {item.owner && (
        <div
          className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
          title={item.owner.name || 'Unknown'}
        >
          {item.owner.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
      {showDueDate && (
        <div
          className={`flex items-center gap-1 text-xs ${isOverdue(item.dueDate!, item.status) ? 'text-red-500' : 'text-gray-400'}`}
          title={`Due: ${formatDate(item.dueDate!, 'medium')}`}
        >
          <Clock className="w-3 h-3" />
        </div>
      )}
      {showNotionLink && (
        <a
          href={item.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
          onClick={e => e.stopPropagation()}
          title="Open in Notion"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </>
  );
});

NodeMetadata.displayName = 'NodeMetadata';

const TreeNodeComponent: React.FC<TreeNodeProps> = memo(({ node, onNodeClick }) => {
  const { toggleExpanded, setSelectedItem } = useStore();
  const { item, children, level, isExpanded, isSelected, isHighlighted } = node;

  const TypeIcon = typeIcons[item.type];
  const hasChildren = children.length > 0;
  const indentPx = level * TREE.INDENT_PX;
  const statusCategory = getStatusCategory(item.status);
  const statusStyle = getStatusColors(item.status);
  const typeStyle = typeColors[item.type];

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (hasChildren) toggleExpanded(item.id);
    },
    [hasChildren, toggleExpanded, item.id]
  );

  const handleClick = useCallback(() => {
    setSelectedItem(item.id);
    onNodeClick(item.id);
  }, [setSelectedItem, item.id, onNodeClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
        e.preventDefault();
        handleToggle(e);
      } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
        e.preventDefault();
        handleToggle(e);
      }
    },
    [handleClick, handleToggle, hasChildren, isExpanded]
  );

  return (
    <div
      className="select-none"
      role="treeitem"
      aria-selected={isSelected}
      aria-level={level + 1}
      data-focused={isHighlighted || undefined}
    >
      <div
        className={getRowClassName(isSelected, isHighlighted)}
        style={{ marginLeft: `${indentPx}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
            className="flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 hover:bg-gray-200 text-gray-500"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5 h-5" aria-hidden="true" />
        )}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusStyle.dot} ${statusCategory === 'in-progress' ? 'animate-pulse-status' : ''}`}
          title={item.status}
        />
        <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeStyle.icon}`} />
        <span
          className={`flex-1 text-sm font-medium truncate ${statusCategory === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'}`}
        >
          {item.title}
        </span>
        <NodeMetadata item={item} />
      </div>
      {hasChildren && isExpanded && (
        <div className="relative">
          <div
            className="absolute w-px bg-gray-200"
            style={{ left: `${indentPx + 22}px`, top: 0, height: '100%' }}
          />
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
