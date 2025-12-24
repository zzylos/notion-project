import React, { useCallback } from 'react';
import {
  X,
  ExternalLink,
  Clock,
  Tag,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Target,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import {
  getStatusColors,
  getStatusCategory,
  typeColors,
  priorityColors,
  typeLabels,
  getProgressColor,
} from '../../utils/colors';
import { typeIcons } from '../../utils/icons';
import { isOverdue, formatDate } from '../../utils/dateUtils';
import { isValidNotionUrl } from '../../utils/validation';
import RelationshipList from './RelationshipList';

interface DetailPanelProps {
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose }) => {
  const { selectedItemId, items, getItemPath, expandToItem } = useStore();

  // Memoize navigation handler - must be before early returns for consistent hook order
  const handleNavigate = useCallback(
    (id: string) => {
      expandToItem(id);
    },
    [expandToItem]
  );

  if (!selectedItemId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
        <div>
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Select an item</p>
          <p className="text-sm mt-1">Click on any item in the tree to see its details</p>
        </div>
      </div>
    );
  }

  const item = items.get(selectedItemId);
  if (!item) return null;

  const path = getItemPath(selectedItemId);
  const TypeIcon = typeIcons[item.type];
  const statusStyle = getStatusColors(item.status);
  const typeStyle = typeColors[item.type];

  // Get parent and children
  const parent = item.parentId ? items.get(item.parentId) : undefined;
  const children =
    item.children
      ?.map(childId => items.get(childId))
      .filter((c): c is WorkItem => c !== undefined) || [];

  // Get blocked by items
  const blockedBy =
    item.blockedBy?.map(id => items.get(id)).filter((i): i is WorkItem => i !== undefined) || [];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`
                px-2 py-0.5 text-xs font-medium rounded
                ${typeStyle.bg} ${typeStyle.text}
              `}
            >
              <span className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                {typeLabels[item.type]}
              </span>
            </span>
            {item.priority && (
              <span
                className={`
                  px-2 py-0.5 text-xs font-semibold rounded
                  ${priorityColors[item.priority].bg}
                  ${priorityColors[item.priority].text}
                `}
              >
                {item.priority}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">{item.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Breadcrumb path */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Path to Mission
          </label>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {path.map((pathItem, index) => {
              const PathIcon = typeIcons[pathItem.type];
              return (
                <React.Fragment key={pathItem.id}>
                  {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <button
                    onClick={() => handleNavigate(pathItem.id)}
                    className={`
                      flex items-center gap-1 px-2 py-0.5 rounded
                      ${
                        pathItem.id === item.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'hover:bg-gray-100 text-gray-600'
                      }
                      transition-colors
                    `}
                  >
                    <PathIcon className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{pathItem.title}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg
                ${statusStyle.bg} ${statusStyle.text}
              `}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
              {item.status}
            </span>
          </div>
        </div>

        {/* Progress */}
        {item.progress !== undefined && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Progress
            </label>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.progress}% complete</span>
                {item.progress >= 80 && getStatusCategory(item.status) !== 'completed' && (
                  <span className="text-amber-600 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Almost done - needs to close!
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(item.progress)}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Description
            </label>
            <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Owner & Assignees */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Owner
          </label>
          {item.owner ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                {item.owner.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.owner.name}</p>
                <p className="text-xs text-gray-500">{item.owner.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No owner assigned</p>
          )}
        </div>

        {/* Due Date */}
        {item.dueDate && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Due Date
            </label>
            <div
              className={`
                flex items-center gap-2 text-sm
                ${isOverdue(item.dueDate, item.status) ? 'text-red-600' : 'text-gray-700'}
              `}
            >
              <Clock className="w-4 h-4" />
              {formatDate(item.dueDate, 'long')}
              {isOverdue(item.dueDate, item.status) && (
                <span className="text-red-500 text-xs font-medium">OVERDUE</span>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blocked By */}
        <RelationshipList
          title="Blocked By"
          icon={AlertTriangle}
          items={blockedBy}
          onNavigate={handleNavigate}
          variant="blocked"
          iconColorClass="text-red-500"
        />

        {/* Parent */}
        {parent && (
          <RelationshipList
            title="Parent"
            icon={ArrowUp}
            items={[parent]}
            onNavigate={handleNavigate}
          />
        )}

        {/* Children */}
        <RelationshipList
          title="Children"
          icon={ArrowDown}
          items={children}
          onNavigate={handleNavigate}
          showStatusDot
          titleSuffix={children.length > 0 ? ` (${children.length})` : undefined}
        />
      </div>

      {/* Footer with Notion link - only show for valid Notion URLs */}
      {item.notionUrl && isValidNotionUrl(item.notionUrl) && (
        <div className="p-4 border-t border-gray-200">
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Notion
          </a>
        </div>
      )}
    </div>
  );
};

export default DetailPanel;
