import { useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { getStatusColors, typeColors, priorityColors } from '../../utils/colors';
import { typeIcons } from '../../utils/icons';

interface DetailPanelProps {
  onClose: () => void;
}

function getRelatedItems(ids: string[] | undefined, items: Map<string, WorkItem>): WorkItem[] {
  return ids?.map(id => items.get(id)).filter((i): i is WorkItem => i !== undefined) || [];
}

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose }) => {
  const { selectedItemId, items, getItemPath, setSelectedItem } = useStore();

  const item = selectedItemId ? items.get(selectedItemId) : undefined;
  const path = useMemo(() => (selectedItemId ? getItemPath(selectedItemId) : []), [selectedItemId, getItemPath]);

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
  const TypeIcon = typeIcons[item.type];
  const typeStyle = typeColors[item.type];
  const statusStyle = getStatusColors(item.status);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
            <TypeIcon className={`w-5 h-5 ${typeStyle.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 break-words">{item.title}</h2>
            <p className={`text-sm ${typeStyle.text} capitalize`}>{item.type}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Breadcrumb path */}
        {path.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            {path.map((pathItem, i) => (
              <span key={pathItem.id} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => setSelectedItem(pathItem.id)}
                  className={`hover:text-blue-600 ${pathItem.id === item.id ? 'font-medium text-gray-700' : ''}`}
                >
                  {pathItem.title}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Status */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-1">Status</div>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
            {item.status}
          </span>
        </div>

        {/* Priority */}
        {item.priority && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Priority</div>
            <span
              className={`inline-flex px-2 py-1 rounded text-sm font-semibold ${priorityColors[item.priority].bg} ${priorityColors[item.priority].text}`}
            >
              {item.priority}
            </span>
          </div>
        )}

        {/* Progress */}
        {item.progress !== undefined && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Progress</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }} />
              </div>
              <span className="text-sm text-gray-600">{item.progress}%</span>
            </div>
          </div>
        )}

        {/* Owner */}
        {item.owner && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Owner</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                {item.owner.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm text-gray-700">{item.owner.name}</span>
            </div>
          </div>
        )}

        {/* Due Date */}
        {item.dueDate && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Due Date</div>
            <span className="text-sm text-gray-700">{item.dueDate}</span>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Description</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Tags</div>
            <div className="flex flex-wrap gap-1">
              {item.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parent */}
        {parent && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Parent</div>
            <button
              onClick={() => setSelectedItem(parent.id)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {parent.title}
            </button>
          </div>
        )}

        {/* Children */}
        {children.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Children ({children.length})</div>
            <div className="space-y-1">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedItem(child.id)}
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {child.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Notion link */}
      {item.notionUrl && (
        <div className="p-4 border-t border-gray-200">
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
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
