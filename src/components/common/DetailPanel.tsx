import { useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { isValidNotionUrl } from '../../utils/validation';
import RelationshipList from './RelationshipList';
import {
  DetailHeader,
  BreadcrumbPath,
  ProgressSection,
  OwnerSection,
  StatusSection,
  DueDateSection,
  TagsSection,
  DescriptionSection,
  NotionLink,
  DetailEmptyState,
  ItemNotFoundState,
} from './detail';

interface DetailPanelProps {
  onClose: () => void;
}

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

  if (!selectedItemId) return <DetailEmptyState />;
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
