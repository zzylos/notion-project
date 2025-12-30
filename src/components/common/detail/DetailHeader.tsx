import React from 'react';
import { X } from 'lucide-react';
import type { WorkItem } from '../../../types';
import { typeColors, priorityColors, typeLabels } from '../../../utils/colors';
import { typeIcons } from '../../../utils/icons';

interface DetailHeaderProps {
  item: WorkItem;
  onClose: () => void;
}

const DetailHeader: React.FC<DetailHeaderProps> = ({ item, onClose }) => {
  const TypeIcon = typeIcons[item.type];
  const typeStyle = typeColors[item.type];

  return (
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
  );
};

DetailHeader.displayName = 'DetailHeader';

export default DetailHeader;
