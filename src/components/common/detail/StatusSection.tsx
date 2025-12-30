import React from 'react';
import { getStatusColors } from '../../../utils/colors';

interface StatusSectionProps {
  status: string;
}

/**
 * Displays the status of a work item with appropriate styling.
 */
const StatusSection: React.FC<StatusSectionProps> = ({ status }) => {
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

StatusSection.displayName = 'StatusSection';

export default StatusSection;
