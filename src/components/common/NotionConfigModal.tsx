import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2, Unplug } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../../types';
import ApiKeySection from './modal/ApiKeySection';
import DatabaseConfigSection from './modal/DatabaseConfigSection';
import PropertyMappingsSection from './modal/PropertyMappingsSection';
import { isValidDatabaseId } from '../../utils/validation';
import { migrateConfig } from '../../utils/config';
import { DEFAULT_PROPERTY_MAPPINGS } from '../../constants';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
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
    setMappings({ ...DEFAULT_PROPERTY_MAPPINGS });
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
          <ApiKeySection apiKey={apiKey} onChange={setApiKey} />

          {/* Multiple Databases */}
          <DatabaseConfigSection
            databases={databases}
            validationErrors={validationErrors}
            onDatabaseChange={updateDatabase}
          />

          {/* Property Mappings */}
          <PropertyMappingsSection
            mappings={mappings}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            onMappingChange={(key, value) => setMappings(prev => ({ ...prev, [key]: value }))}
          />

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
