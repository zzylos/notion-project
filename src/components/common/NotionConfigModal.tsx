import React, { useState } from 'react';
import { X, Key, Database, Settings, HelpCircle, ExternalLink, CheckCircle2, AlertCircle, Loader2, Unplug, Target, AlertTriangle, Lightbulb, FolderKanban, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../../types';
import { DEFAULT_PROPERTY_MAPPINGS } from '../../constants';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

// Database type configuration
interface DatabaseTypeInfo {
  type: ItemType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const databaseTypes: DatabaseTypeInfo[] = [
  { type: 'mission', label: 'Objectives', description: 'High-level goals and objectives', icon: Target, color: 'text-purple-600' },
  { type: 'problem', label: 'Problems', description: 'Issues and challenges to solve', icon: AlertTriangle, color: 'text-red-600' },
  { type: 'solution', label: 'Solutions', description: 'Proposed solutions and approaches', icon: Lightbulb, color: 'text-amber-600' },
  { type: 'project', label: 'Projects', description: 'Active projects and initiatives', icon: FolderKanban, color: 'text-blue-600' },
  { type: 'design', label: 'Deliverables', description: 'Outputs and deliverables', icon: Package, color: 'text-green-600' },
];

// Use centralized default property mappings
const defaultMappings: PropertyMappings = { ...DEFAULT_PROPERTY_MAPPINGS };

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

// Validate Notion database ID format (UUID with or without hyphens)
const isValidDatabaseId = (id: string): boolean => {
  if (!id.trim()) return true; // Empty is valid (optional field)
  const trimmed = id.trim();
  // UUID with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidWithHyphens = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // UUID without hyphens: 32 hex characters
  const uuidWithoutHyphens = /^[0-9a-f]{32}$/i;
  return uuidWithHyphens.test(trimmed) || uuidWithoutHyphens.test(trimmed);
};

// Helper to convert legacy config to new format
function migrateConfig(config: NotionConfig | null): { apiKey: string; databases: Record<ItemType, string>; mappings: PropertyMappings } {
  const databases: Record<ItemType, string> = {
    mission: '',
    problem: '',
    solution: '',
    project: '',
    design: '',
  };

  if (!config) {
    return { apiKey: '', databases, mappings: defaultMappings };
  }

  // If we have the new format
  if (config.databases && config.databases.length > 0) {
    config.databases.forEach(db => {
      databases[db.type] = db.databaseId;
    });
    return {
      apiKey: config.apiKey,
      databases,
      mappings: config.defaultMappings || defaultMappings,
    };
  }

  // Legacy format - put the single database ID in project
  if (config.databaseId) {
    databases.project = config.databaseId;
  }

  return {
    apiKey: config.apiKey,
    databases,
    mappings: config.mappings ? {
      title: config.mappings.title,
      status: config.mappings.status,
      priority: config.mappings.priority,
      owner: config.mappings.owner,
      parent: config.mappings.parent,
      progress: config.mappings.progress,
      dueDate: config.mappings.dueDate,
      tags: config.mappings.tags,
    } : defaultMappings,
  };
}

const NotionConfigModal: React.FC<NotionConfigModalProps> = ({ isOpen, onClose, onConnect }) => {
  const { setNotionConfig, notionConfig } = useStore();

  const migrated = migrateConfig(notionConfig);

  const [apiKey, setApiKey] = useState(migrated.apiKey);
  const [databases, setDatabases] = useState<Record<ItemType, string>>(migrated.databases);
  const [mappings, setMappings] = useState<PropertyMappings>(migrated.mappings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<ItemType, string | null>>({
    mission: null,
    problem: null,
    solution: null,
    project: null,
    design: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);

    // Validate all database IDs
    const newValidationErrors: Record<ItemType, string | null> = {
      mission: null,
      problem: null,
      solution: null,
      project: null,
      design: null,
    };
    let hasValidationErrors = false;

    for (const [type, dbId] of Object.entries(databases) as [ItemType, string][]) {
      if (dbId.trim() && !isValidDatabaseId(dbId)) {
        newValidationErrors[type] = 'Invalid ID format';
        hasValidationErrors = true;
      }
    }

    setValidationErrors(newValidationErrors);

    if (hasValidationErrors) {
      setError('Please fix the invalid database IDs. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      setIsConnecting(false);
      return;
    }

    // Build database configs from non-empty entries
    const databaseConfigs: DatabaseConfig[] = [];
    for (const [type, dbId] of Object.entries(databases)) {
      if (dbId.trim()) {
        databaseConfigs.push({
          databaseId: dbId.trim(),
          type: type as ItemType,
        });
      }
    }

    if (databaseConfigs.length === 0) {
      setError('Please enter at least one database ID');
      setIsConnecting(false);
      return;
    }

    const config: NotionConfig = {
      apiKey,
      databases: databaseConfigs,
      defaultMappings: mappings,
    };

    setNotionConfig(config);
    setIsConnecting(false);
    onConnect();
    onClose();
  };

  const handleDisconnect = () => {
    setNotionConfig(null);
    setApiKey('');
    setDatabases({
      mission: '',
      problem: '',
      solution: '',
      project: '',
      design: '',
    });
    setMappings(defaultMappings);
    onConnect();
    onClose();
  };

  const handleUseDemoData = () => {
    setNotionConfig(null);
    onConnect();
    onClose();
  };

  const updateDatabase = (type: ItemType, value: string) => {
    setDatabases(prev => ({ ...prev, [type]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[type]) {
      setValidationErrors(prev => ({ ...prev, [type]: null }));
    }
    // Validate on blur would be nicer, but for now validate as they type if there's content
    if (value.trim() && !isValidDatabaseId(value)) {
      setValidationErrors(prev => ({ ...prev, [type]: 'Invalid format' }));
    }
  };

  if (!isOpen) return null;

  const hasAnyDatabase = Object.values(databases).some(id => id.trim());
  const isConnected = notionConfig && notionConfig.apiKey && (notionConfig.databases?.length > 0 || notionConfig.databaseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">N</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connect to Notion</h2>
              <p className="text-sm text-gray-500">Configure your Notion databases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        {isConnected && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Connected to Notion</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Unplug className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-4 pt-4">
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Key className="w-4 h-4" />
              Notion API Key
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <HelpCircle className="w-4 h-4" />
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="secret_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-xs text-gray-500">
              Create an integration at{' '}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                notion.so/my-integrations
              </a>
              {' '}and share all databases with it.
            </p>
          </div>

          {/* Multiple Databases */}
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
                        onChange={(e) => updateDatabase(type, e.target.value)}
                        placeholder={description}
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
                        <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500">
              Copy database IDs from your Notion database URLs. Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            </p>
          </div>

          {/* Property Mappings */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" />
              Property Mappings
              <span className="text-xs text-gray-500">
                ({showAdvanced ? 'hide' : 'show'})
              </span>
            </button>

            {showAdvanced && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <p className="text-xs text-gray-600">
                  Default property names for all databases. Most databases use the same column names.
                </p>
                {(Object.entries(mappings) as [keyof PropertyMappings, string][]).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-28 flex-shrink-0">
                      <label className="text-xs font-medium text-gray-700 capitalize block">
                        {key}
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {mappingDescriptions[key]}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setMappings((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={key === 'title' ? '(auto-detected)' : '(optional)'}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Each database type will be fetched separately and combined into a unified view.
              Parent relations can link items across different databases.
            </p>
          </div>

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!apiKey || !hasAnyDatabase || isConnecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isConnected ? 'Update Connection' : 'Connect to Notion'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo data option */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Don't have Notion set up yet? Try with demo data:
            </p>
            <button
              onClick={handleUseDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Use Demo Data Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotionConfigModal;
