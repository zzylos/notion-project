import React from 'react';
import { Gauge, AlertCircle } from 'lucide-react';
import { VIEW_LIMITS } from '../../../constants';

interface PerformanceSettingsProps {
  disableItemLimit: boolean;
  onToggle: () => void;
}

const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({
  disableItemLimit,
  onToggle,
}) => {
  const isLimitEnabled = !disableItemLimit;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">Performance Settings</h3>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">Limit items for performance</div>
          <div className="text-xs text-gray-500 mt-0.5">
            When enabled, views will show at most {VIEW_LIMITS.ITEM_LIMIT} items to prevent lag
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isLimitEnabled}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isLimitEnabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isLimitEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {disableItemLimit && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Item limit is disabled. Views with many items may be slow to render.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceSettings;
