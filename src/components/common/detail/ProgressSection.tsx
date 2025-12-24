import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getStatusCategory, getProgressColor } from '../../../utils/colors';

interface ProgressSectionProps {
  progress: number;
  status: string;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ progress, status }) => {
  const showWarning = progress >= 80 && getStatusCategory(status) !== 'completed';

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Progress
      </label>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{progress}% complete</span>
          {showWarning && (
            <span className="text-amber-600 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Almost done - needs to close!
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressSection;
