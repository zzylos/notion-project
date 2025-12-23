import {
  Database,
  Target,
  AlertTriangle,
  Lightbulb,
  FolderKanban,
  Package,
  CheckCircle2,
} from 'lucide-react';
import type { ItemType } from '../../../types';
import { isValidDatabaseId } from '../../../utils/validation';

interface DatabaseTypeInfo {
  type: ItemType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const databaseTypes: DatabaseTypeInfo[] = [
  {
    type: 'mission',
    label: 'Objectives',
    description: 'High-level goals and objectives',
    icon: Target,
    color: 'text-purple-600',
  },
  {
    type: 'problem',
    label: 'Problems',
    description: 'Issues and challenges to solve',
    icon: AlertTriangle,
    color: 'text-red-600',
  },
  {
    type: 'solution',
    label: 'Solutions',
    description: 'Proposed solutions and approaches',
    icon: Lightbulb,
    color: 'text-amber-600',
  },
  {
    type: 'project',
    label: 'Projects',
    description: 'Active projects and initiatives',
    icon: FolderKanban,
    color: 'text-blue-600',
  },
  {
    type: 'design',
    label: 'Deliverables',
    description: 'Outputs and deliverables',
    icon: Package,
    color: 'text-green-600',
  },
];

interface DatabaseConfigSectionProps {
  databases: Record<ItemType, string>;
  validationErrors: Record<ItemType, string | null>;
  onDatabaseChange: (type: ItemType, value: string) => void;
}

/**
 * DatabaseConfigSection handles the multiple database ID inputs in the config modal.
 */
const DatabaseConfigSection: React.FC<DatabaseConfigSectionProps> = ({
  databases,
  validationErrors,
  onDatabaseChange,
}) => {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Database className="w-4 h-4" />
        Database IDs
      </label>
      <p className="text-xs text-gray-500">
        Enter the database ID for each type. Leave empty if you don't have that database.
      </p>

      <div className="space-y-2">
        {databaseTypes.map(({ type, label, description, icon: Icon, color }) => {
          const hasError = validationErrors[type] !== null;
          const hasValidValue = databases[type].trim() && isValidDatabaseId(databases[type]);
          return (
            <div key={type} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
                <div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={databases[type]}
                  onChange={e => onDatabaseChange(type, e.target.value)}
                  placeholder={description}
                  aria-label={`${label} database ID`}
                  aria-invalid={hasError}
                  className={`w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                    hasError
                      ? 'border-red-400 bg-red-50'
                      : hasValidValue
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300'
                  }`}
                />
                {hasError && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500">
                    {validationErrors[type]}
                  </span>
                )}
                {hasValidValue && (
                  <CheckCircle2
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500"
                    aria-label="Valid database ID"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Copy database IDs from your Notion database URLs. Format:
        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      </p>
    </div>
  );
};

export default DatabaseConfigSection;
