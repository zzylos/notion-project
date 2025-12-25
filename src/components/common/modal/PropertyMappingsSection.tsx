import React from 'react';
import { Settings } from 'lucide-react';
import type { PropertyMappings } from '../../../types';

const mappingDescriptions: Record<keyof PropertyMappings, string> = {
  title: 'Auto-detected (your title column)',
  status: 'Status column name',
  priority: 'Priority level (P0-P3)',
  owner: 'Person/Owner column',
  parent: 'Parent relation column',
  progress: 'Progress % (number)',
  dueDate: 'Due date / Deadline',
  tags: 'Tags (multi-select)',
};

interface PropertyMappingsSectionProps {
  mappings: PropertyMappings;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onMappingChange: (key: keyof PropertyMappings, value: string) => void;
}

/**
 * PropertyMappingsSection handles the property mapping configuration
 * for connecting Notion database columns to work item fields.
 */
const PropertyMappingsSection: React.FC<PropertyMappingsSectionProps> = ({
  mappings,
  showAdvanced,
  onToggleAdvanced,
  onMappingChange,
}) => {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        aria-expanded={showAdvanced}
        aria-controls="property-mappings-panel"
      >
        <Settings className="w-4 h-4" />
        Property Mappings
        <span className="text-xs text-gray-500">({showAdvanced ? 'hide' : 'show'})</span>
      </button>

      {showAdvanced && (
        <div id="property-mappings-panel" className="p-3 bg-gray-50 rounded-lg space-y-3">
          <p className="text-xs text-gray-600">
            Default property names for all databases. Most databases use the same column names.
          </p>
          {(Object.entries(mappings) as [keyof PropertyMappings, string][]).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-28 flex-shrink-0">
                <label
                  htmlFor={`mapping-${key}`}
                  className="text-xs font-medium text-gray-700 capitalize block"
                >
                  {key}
                </label>
                <span className="text-[10px] text-gray-400">{mappingDescriptions[key]}</span>
              </div>
              <input
                id={`mapping-${key}`}
                type="text"
                value={value}
                onChange={e => onMappingChange(key, e.target.value)}
                placeholder={key === 'title' ? '(auto-detected)' : '(optional)'}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyMappingsSection;
