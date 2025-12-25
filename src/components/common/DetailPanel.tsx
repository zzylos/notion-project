import React, { useCallback, useMemo } from 'react';
import {
  ExternalLink,
  Clock,
  Tag,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Target,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { getStatusColors } from '../../utils/colors';
import { isOverdue, formatDate } from '../../utils/dateUtils';
import { isValidNotionUrl } from '../../utils/validation';
import RelationshipList from './RelationshipList';
import { DetailHeader, BreadcrumbPath, ProgressSection, OwnerSection } from './detail';

interface DetailPanelProps {
  onClose: () => void;
}

const EmptyState: React.FC = () => (
  <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
    <div>
      <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium">Select an item</p>
      <p className="text-sm mt-1">Click on any item in the tree to see its details</p>
    </div>
  </div>
);

const ItemNotFoundState: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
    <div>
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
      <p className="text-lg font-medium text-gray-600">Item not found</p>
      <p className="text-sm mt-1 text-gray-500">
        This item may have been deleted or is no longer available
      </p>
      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        Clear selection
      </button>
    </div>
  </div>
);

const StatusSection: React.FC<{ status: string }> = ({ status }) => {
  const statusStyle = getStatusColors(status);
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusStyle.bg} ${statusStyle.text}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
        {status}
      </span>
    </div>
  );
};

const DueDateSection: React.FC<{ dueDate: string; status: string }> = ({ dueDate, status }) => {
  const overdue = isOverdue(dueDate, status);
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Due Date
      </label>
      <div
        className={`flex items-center gap-2 text-sm ${overdue ? 'text-red-600' : 'text-gray-700'}`}
      >
        <Clock className="w-4 h-4" />
        {formatDate(dueDate, 'long')}
        {overdue && <span className="text-red-500 text-xs font-medium">OVERDUE</span>}
      </div>
    </div>
  );
};

const TagsSection: React.FC<{ tags: string[] }> = ({ tags }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</label>
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
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
);

const DescriptionSection: React.FC<{ description: string }> = ({ description }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Description
    </label>
    <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
  </div>
);

const NotionLink: React.FC<{ url: string }> = ({ url }) => (
  <div className="p-4 border-t border-gray-200">
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
      Open in Notion
    </a>
  </div>
);

function getRelatedItems(ids: string[] | undefined, items: Map<string, WorkItem>): WorkItem[] {
  return ids?.map(id => items.get(id)).filter((i): i is WorkItem => i !== undefined) || [];
}

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose }) => {
  const { selectedItemId, items, getItemPath, expandToItem } = useStore();
  const handleNavigate = useCallback((id: string) => expandToItem(id), [expandToItem]);

  const item = selectedItemId ? items.get(selectedItemId) : undefined;
  const path = useMemo(
    () => (selectedItemId ? getItemPath(selectedItemId) : []),
    [selectedItemId, getItemPath]
  );

  if (!selectedItemId) return <EmptyState />;
  if (!item) return <ItemNotFoundState onClose={onClose} />;

  const parent = item.parentId ? items.get(item.parentId) : undefined;
  const children = getRelatedItems(item.children, items);
  const blockedBy = getRelatedItems(item.blockedBy, items);
  const hasValidNotionUrl = item.notionUrl && isValidNotionUrl(item.notionUrl);

  return (
    <div className="h-full flex flex-col bg-white">
      <DetailHeader item={item} onClose={onClose} />
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <BreadcrumbPath path={path} currentItemId={item.id} onNavigate={handleNavigate} />
        <StatusSection status={item.status} />
        {item.progress !== undefined && (
          <ProgressSection progress={item.progress} status={item.status} />
        )}
        {item.description && <DescriptionSection description={item.description} />}
        <OwnerSection owner={item.owner} />
        {item.dueDate && <DueDateSection dueDate={item.dueDate} status={item.status} />}
        {item.tags?.length ? <TagsSection tags={item.tags} /> : null}
        <RelationshipList
          title="Blocked By"
          icon={AlertTriangle}
          items={blockedBy}
          onNavigate={handleNavigate}
          variant="blocked"
          iconColorClass="text-red-500"
        />
        {parent && (
          <RelationshipList
            title="Parent"
            icon={ArrowUp}
            items={[parent]}
            onNavigate={handleNavigate}
          />
        )}
        <RelationshipList
          title="Children"
          icon={ArrowDown}
          items={children}
          onNavigate={handleNavigate}
          showStatusDot
          titleSuffix={children.length > 0 ? ` (${children.length})` : undefined}
        />
      </div>
      {hasValidNotionUrl && <NotionLink url={item.notionUrl!} />}
    </div>
  );
};

export default DetailPanel;
