import React, { useState, useCallback } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../../types';
import ApiKeySection from './modal/ApiKeySection';
import DatabaseConfigSection from './modal/DatabaseConfigSection';
import PropertyMappingsSection from './modal/PropertyMappingsSection';
import ConnectionStatus from './modal/ConnectionStatus';
import PerformanceSettings from './modal/PerformanceSettings';
import LockedConfigBanner from './modal/LockedConfigBanner';
import { isValidDatabaseId } from '../../utils/validation';
import { migrateConfig, isConfigUIDisabled, hasEnvConfig } from '../../utils/config';
import { DEFAULT_PROPERTY_MAPPINGS } from '../../constants';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

type ValidationErrors = Record<ItemType, string | null>;

const EMPTY_VALIDATION_ERRORS: ValidationErrors = {
  mission: null,
  problem: null,
  solution: null,
  project: null,
  design: null,
};

const EMPTY_DATABASES: Record<ItemType, string> = {
  mission: '',
  problem: '',
  solution: '',
  project: '',
  design: '',
};

function validateDatabases(databases: Record<ItemType, string>): {
  errors: ValidationErrors;
  hasErrors: boolean;
} {
  const errors: ValidationErrors = { ...EMPTY_VALIDATION_ERRORS };
  let hasErrors = false;

  for (const [type, dbId] of Object.entries(databases) as [ItemType, string][]) {
    if (dbId.trim() && !isValidDatabaseId(dbId)) {
      errors[type] = 'Invalid ID format';
      hasErrors = true;
    }
  }

  return { errors, hasErrors };
}

function buildDatabaseConfigs(databases: Record<ItemType, string>): DatabaseConfig[] {
  return Object.entries(databases)
    .filter(([, dbId]) => dbId.trim())
    .map(([type, dbId]) => ({ databaseId: dbId.trim(), type: type as ItemType }));
}

const ModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
);

const ErrorMessage: React.FC<{ error: string }> = ({ error }) => (
  <div className="px-4 pt-4">
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{error}</div>
    </div>
  </div>
);

const InfoBox: React.FC = () => (
  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-xs text-blue-800">
      <strong>Note:</strong> Each database type will be fetched separately and combined into a
      unified view. Parent relations can link items across different databases.
    </p>
  </div>
);

interface SubmitButtonProps {
  isConnecting: boolean;
  isConnected: boolean;
  disabled: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isConnecting, isConnected, disabled }) => (
  <div className="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={disabled}
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
);

const DemoDataOption: React.FC<{ onUseDemoData: () => void }> = ({ onUseDemoData }) => (
  <div className="p-4 border-t border-gray-200 bg-gray-50">
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">
        Don't have Notion set up yet? Try with demo data:
      </p>
      <button
        onClick={onUseDemoData}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Use Demo Data Instead
      </button>
    </div>
  </div>
);

interface FormSubmitParams {
  databases: Record<ItemType, string>;
  apiKey: string;
  mappings: PropertyMappings;
  setNotionConfig: (config: NotionConfig | null) => void;
  callbacks: { onConnect: () => void; onClose: () => void };
  stateSetters: {
    setError: (error: string | null) => void;
    setValidationErrors: (errors: ValidationErrors) => void;
    setIsConnecting: (connecting: boolean) => void;
  };
}

function useFormSubmit(params: FormSubmitParams) {
  const { databases, apiKey, mappings, setNotionConfig, callbacks, stateSetters } = params;
  const { onConnect, onClose } = callbacks;
  const { setError, setValidationErrors, setIsConnecting } = stateSetters;

  return useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsConnecting(true);
      setError(null);

      const { errors, hasErrors } = validateDatabases(databases);
      setValidationErrors(errors);

      if (hasErrors) {
        setError(
          'Please fix the invalid database IDs. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
        setIsConnecting(false);
        return;
      }

      const databaseConfigs = buildDatabaseConfigs(databases);
      if (databaseConfigs.length === 0) {
        setError('Please enter at least one database ID');
        setIsConnecting(false);
        return;
      }

      setNotionConfig({ apiKey, databases: databaseConfigs, defaultMappings: mappings });
      setIsConnecting(false);
      onConnect();
      onClose();
    },
    [
      databases,
      apiKey,
      mappings,
      setNotionConfig,
      onConnect,
      onClose,
      setError,
      setValidationErrors,
      setIsConnecting,
    ]
  );
}

const NotionConfigModal: React.FC<NotionConfigModalProps> = ({ isOpen, onClose, onConnect }) => {
  const { setNotionConfig, notionConfig, disableItemLimit, setDisableItemLimit } = useStore();

  const migrated = migrateConfig(notionConfig);
  const configUIDisabled = isConfigUIDisabled();
  const usingEnvConfig = hasEnvConfig();

  const [apiKey, setApiKey] = useState(migrated.apiKey);
  const [databases, setDatabases] = useState<Record<ItemType, string>>(migrated.databases);
  const [mappings, setMappings] = useState<PropertyMappings>(migrated.mappings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>(EMPTY_VALIDATION_ERRORS);

  const handleSubmit = useFormSubmit({
    databases,
    apiKey,
    mappings,
    setNotionConfig,
    callbacks: { onConnect, onClose },
    stateSetters: { setError, setValidationErrors, setIsConnecting },
  });

  const handleDisconnect = useCallback(() => {
    setNotionConfig(null);
    setApiKey('');
    setDatabases({ ...EMPTY_DATABASES });
    setMappings({ ...DEFAULT_PROPERTY_MAPPINGS });
    onConnect();
    onClose();
  }, [setNotionConfig, onConnect, onClose]);

  const handleUseDemoData = useCallback(() => {
    setNotionConfig(null);
    onConnect();
    onClose();
  }, [setNotionConfig, onConnect, onClose]);

  const updateDatabase = useCallback((type: ItemType, value: string) => {
    setDatabases(prev => ({ ...prev, [type]: value }));
    setValidationErrors(prev => (prev[type] ? { ...prev, [type]: null } : prev));
    if (value.trim() && !isValidDatabaseId(value)) {
      setValidationErrors(prev => ({ ...prev, [type]: 'Invalid format' }));
    }
  }, []);

  if (!isOpen) return null;

  const hasAnyDatabase = Object.values(databases).some(id => id.trim());
  const isConnected = Boolean(
    notionConfig?.apiKey && (notionConfig.databases?.length || notionConfig.databaseId)
  );
  const canSubmit = apiKey && hasAnyDatabase && !isConnecting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <ModalHeader onClose={onClose} />
        <ConnectionStatus
          isConnected={isConnected}
          configUIDisabled={configUIDisabled}
          onDisconnect={handleDisconnect}
        />
        {error && <ErrorMessage error={error} />}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {configUIDisabled ? (
            <LockedConfigBanner usingEnvConfig={usingEnvConfig} />
          ) : (
            <>
              <ApiKeySection apiKey={apiKey} onChange={setApiKey} />
              <DatabaseConfigSection
                databases={databases}
                validationErrors={validationErrors}
                onDatabaseChange={updateDatabase}
              />
              <PropertyMappingsSection
                mappings={mappings}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                onMappingChange={(key, value) => setMappings(prev => ({ ...prev, [key]: value }))}
              />
            </>
          )}
          <PerformanceSettings
            disableItemLimit={disableItemLimit}
            onToggle={() => setDisableItemLimit(!disableItemLimit)}
          />
          {!configUIDisabled && <InfoBox />}
          {!configUIDisabled && (
            <SubmitButton
              isConnecting={isConnecting}
              isConnected={isConnected}
              disabled={!canSubmit}
            />
          )}
          {configUIDisabled && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </form>

        {!configUIDisabled && <DemoDataOption onUseDemoData={handleUseDemoData} />}
      </div>
    </div>
  );
};

export default NotionConfigModal;
