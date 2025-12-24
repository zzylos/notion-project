import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { WorkItem } from '../../../types';
import { typeIcons } from '../../../utils/icons';

interface BreadcrumbPathProps {
  path: WorkItem[];
  currentItemId: string;
  onNavigate: (id: string) => void;
}

const BreadcrumbPath: React.FC<BreadcrumbPathProps> = ({ path, currentItemId, onNavigate }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Path to Mission
      </label>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {path.map((pathItem, index) => {
          const PathIcon = typeIcons[pathItem.type];
          const isCurrentItem = pathItem.id === currentItemId;
          return (
            <React.Fragment key={pathItem.id}>
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <button
                onClick={() => onNavigate(pathItem.id)}
                className={`
                  flex items-center gap-1 px-2 py-0.5 rounded
                  ${isCurrentItem ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}
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
  );
};

export default BreadcrumbPath;
