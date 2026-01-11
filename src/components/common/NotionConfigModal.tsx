import React, { useState, useCallback } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig, DatabaseConfig, PropertyMappings, ItemType } from '../../types';
import { isValidDatabaseId } from '../../utils/validation';
import { DEFAULT_PROPERTY_MAPPINGS } from '../../constants';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATABASE_TYPES: { type: ItemType; label: string }[] = [
  { type: 'mission', label: 'Objectives' },
  { type: 'problem', label: 'Problems' },
  { type: 'solution', label: 'Solutions' },
  { type: 'project', label: 'Projects' },
  { type: 'design', label: 'Deliverables' },
];

const NotionConfigModal: React.FC<NotionConfigModalProps> = ({ isOpen, onClose }) => {
  const { setNotionConfig, notionConfig } = useStore();

  const [apiKey, setApiKey] = useState(notionConfig?.apiKey || '');
  const [databases, setDatabases] = useState<Record<ItemType, string>>(() => {
    const initial: Record<ItemType, string> = {
      mission: '',
      problem: '',
      solution: '',
      project: '',
      design: '',
    };
    notionConfig?.databases?.forEach(db => {
      initial[db.type] = db.databaseId;
    });
    return initial;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsConnecting(true);
      setError(null);

      // Validate database IDs
      const databaseConfigs: DatabaseConfig[] = [];
      for (const [type, dbId] of Object.entries(databases) as [ItemType, string][]) {
        if (dbId.trim()) {
          if (!isValidDatabaseId(dbId)) {
            setError(`Invalid database ID format for ${type}`);
            setIsConnecting(false);
            return;
          }
          databaseConfigs.push({ databaseId: dbId.trim(), type });
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
        defaultMappings: DEFAULT_PROPERTY_MAPPINGS as PropertyMappings,
      };

      setNotionConfig(config);
      setIsConnecting(false);
      onClose();
    },
    [databases, apiKey, setNotionConfig, onClose]
  );

  const handleDisconnect = useCallback(() => {
    setNotionConfig(null);
    setApiKey('');
    setDatabases({
      mission: '',
      problem: '',
      solution: '',
      project: '',
      design: '',
    });
    onClose();
  }, [setNotionConfig, onClose]);

  if (!isOpen) return null;

  const hasAnyDatabase = Object.values(databases).some(id => id.trim());
  const isConnected = Boolean(notionConfig?.apiKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notion Configuration</h2>
            <p className="text-sm text-gray-500">Connect your Notion databases</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="secret_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Database IDs */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Database IDs</label>
            {DATABASE_TYPES.map(({ type, label }) => (
              <div key={type}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="text"
                  value={databases[type]}
                  onChange={e => setDatabases(prev => ({ ...prev, [type]: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                Disconnect
              </button>
            )}
            <button
              type="submit"
              disabled={!apiKey || !hasAnyDatabase || isConnecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isConnected ? 'Update' : 'Connect'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotionConfigModal;
