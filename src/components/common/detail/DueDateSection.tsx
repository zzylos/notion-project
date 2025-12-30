import React from 'react';
import { Clock } from 'lucide-react';
import { isOverdue, formatDate } from '../../../utils/dateUtils';

interface DueDateSectionProps {
  dueDate: string;
  status: string;
}

/**
 * Displays the due date with overdue warning if applicable.
 */
const DueDateSection: React.FC<DueDateSectionProps> = ({ dueDate, status }) => {
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

DueDateSection.displayName = 'DueDateSection';

export default DueDateSection;
