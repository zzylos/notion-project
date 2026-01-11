import { useMemo } from 'react';
import { X, ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { getStatusColors, typeColors, priorityColors, getProgressColor } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';

interface DetailPanelProps {
  onClose: () => void;
}

/**
 * Format a date string to a readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 days")
 */
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

/**
 * Check if a date is overdue
 */
function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function getRelatedItems(ids: string[] | undefined, items: Map<string, WorkItem>): WorkItem[] {
  return ids?.map(id => items.get(id)).filter((i): i is WorkItem => i !== undefined) || [];
}

/**
 * Compact card for displaying a related item (parent, child, dependency, etc.)
 */
const RelatedItemCard: React.FC<{
  item: WorkItem;
  onClick: () => void;
  showStatus?: boolean;
}> = ({ item, onClick, showStatus = true }) => {
  const TypeIcon = typeIcons[item.type];
  const typeStyle = typeColors[item.type];
  const statusStyle = getStatusColors(item.status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
    >
      {/* Type icon */}
      <div className={`p-1.5 rounded ${typeStyle.bg} flex-shrink-0`}>
        <TypeIcon className={`w-3.5 h-3.5 ${typeStyle.icon}`} />
      </div>

      {/* Title and meta */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
          {item.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${typeStyle.text} capitalize`}>{item.type}</span>
          {showStatus && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {item.status}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Priority badge */}
      {item.priority && (
        <span
          className={`px-1.5 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${priorityColors[item.priority].bg} ${priorityColors[item.priority].text}`}
        >
          {item.priority}
        </span>
      )}
    </button>
  );
};

/**
 * Section header component
 */
const SectionHeader: React.FC<{ children: React.ReactNode; count?: number }> = ({
  children,
  count,
}) => (
  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
    {children}
    {count !== undefined && (
      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium normal-case">
        {count}
      </span>
    )}
  </div>
);

/**
 * Divider between sections
 */
const SectionDivider: React.FC = () => <hr className="border-gray-100 my-4" />;

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose }) => {
  const { selectedItemId, items, getItemPath, setSelectedItem } = useStore();

  const item = selectedItemId ? items.get(selectedItemId) : undefined;
  const path = useMemo(
    () => (selectedItemId ? getItemPath(selectedItemId) : []),
    [selectedItemId, getItemPath]
  );

  if (!selectedItemId) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="text-gray-500">
          <p className="font-medium">No item selected</p>
          <p className="text-sm mt-1">Click an item to view details</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="text-gray-500">
          <p className="font-medium">Item not found</p>
          <button onClick={onClose} className="text-blue-500 hover:text-blue-700 text-sm mt-2">
            Close panel
          </button>
        </div>
      </div>
    );
  }

  const parent = item.parentId ? items.get(item.parentId) : undefined;
  const children = getRelatedItems(item.children, items);
  const dependencies = getRelatedItems(item.dependencies, items);
  const blockedBy = getRelatedItems(item.blockedBy, items);
  const TypeIcon = typeIcons[item.type];
  const typeStyle = typeColors[item.type];
  const statusStyle = getStatusColors(item.status);
  const dueDateOverdue = item.dueDate && isOverdue(item.dueDate);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
            <TypeIcon className={`w-5 h-5 ${typeStyle.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 break-words">{item.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${typeStyle.text} capitalize font-medium`}>{item.type}</span>
              {item.priority && (
                <span
                  className={`px-1.5 py-0.5 text-xs font-semibold rounded ${priorityColors[item.priority].bg} ${priorityColors[item.priority].text}`}
                >
                  {item.priority}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Breadcrumb path */}
        {path.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
            {path.map((pathItem, i) => (
              <span key={pathItem.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">/</span>}
                <button
                  onClick={() => setSelectedItem(pathItem.id)}
                  className={`hover:text-blue-600 transition-colors ${pathItem.id === item.id ? 'font-medium text-gray-700' : ''}`}
                >
                  {pathItem.title}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Status & Progress Section */}
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}
            >
              <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              {item.status}
            </span>
          </div>

          {/* Progress */}
          {item.progress !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500">Progress</span>
                <span className="text-sm font-medium text-gray-700">{item.progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(item.progress)}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Due Date */}
          {item.dueDate && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Due Date</span>
              <div
                className={`flex items-center gap-1.5 text-sm ${dueDateOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}
              >
                {dueDateOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatDate(item.dueDate)}</span>
                <span className="text-xs text-gray-400">({getRelativeTime(item.dueDate)})</span>
              </div>
            </div>
          )}
        </div>

        <SectionDivider />

        {/* Parent Section */}
        {parent && (
          <>
            <div>
              <SectionHeader>Parent</SectionHeader>
              <RelatedItemCard item={parent} onClick={() => setSelectedItem(parent.id)} />
            </div>
            <SectionDivider />
          </>
        )}

        {/* Children Section */}
        {children.length > 0 && (
          <>
            <div>
              <SectionHeader count={children.length}>Children</SectionHeader>
              <div className="space-y-2">
                {children.map(child => (
                  <RelatedItemCard
                    key={child.id}
                    item={child}
                    onClick={() => setSelectedItem(child.id)}
                  />
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Dependencies Section */}
        {dependencies.length > 0 && (
          <>
            <div>
              <SectionHeader count={dependencies.length}>Dependencies</SectionHeader>
              <div className="space-y-2">
                {dependencies.map(dep => (
                  <RelatedItemCard
                    key={dep.id}
                    item={dep}
                    onClick={() => setSelectedItem(dep.id)}
                  />
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Blocked By Section */}
        {blockedBy.length > 0 && (
          <>
            <div>
              <SectionHeader count={blockedBy.length}>Blocked By</SectionHeader>
              <div className="space-y-2">
                {blockedBy.map(blocker => (
                  <RelatedItemCard
                    key={blocker.id}
                    item={blocker}
                    onClick={() => setSelectedItem(blocker.id)}
                  />
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Owner & Assignees */}
        {(item.owner || (item.assignees && item.assignees.length > 0)) && (
          <>
            <div className="space-y-3">
              {item.owner && (
                <div>
                  <SectionHeader>Owner</SectionHeader>
                  <div className="flex items-center gap-2">
                    {item.owner.avatar ? (
                      <img
                        src={item.owner.avatar}
                        alt={item.owner.name}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {item.owner.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm text-gray-700">{item.owner.name}</span>
                  </div>
                </div>
              )}

              {item.assignees && item.assignees.length > 0 && (
                <div>
                  <SectionHeader count={item.assignees.length}>Assignees</SectionHeader>
                  <div className="flex flex-wrap gap-2">
                    {item.assignees.map(assignee => (
                      <div
                        key={assignee.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full"
                      >
                        {assignee.avatar ? (
                          <img
                            src={assignee.avatar}
                            alt={assignee.name}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {assignee.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs text-gray-700">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <SectionDivider />
          </>
        )}

        {/* Description */}
        {item.description && (
          <>
            <div>
              <SectionHeader>Description</SectionHeader>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <>
            <div>
              <SectionHeader count={item.tags.length}>Tags</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Timestamps */}
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Created {formatDate(item.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {formatDate(item.updatedAt)}</span>
            <span className="text-gray-300">·</span>
            <span>{getRelativeTime(item.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Footer with Notion link */}
      {item.notionUrl && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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
