import React, { useState } from 'react';
import { X, Key, Database, Settings, HelpCircle, ExternalLink, CheckCircle2, AlertCircle, Loader2, Unplug } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig } from '../../types';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

// Default mappings - title is auto-detected, others use common names
const defaultMappings = {
  title: 'Name',           // Auto-detected from any 'title' type property
  type: 'Type',            // Optional: select property for item type
  status: 'Status',        // Required: select/status property
  priority: 'Priority',    // Optional: select property for priority
  owner: 'Owner',          // Optional: people property
  parent: 'Parent',        // Optional: relation property for hierarchy
  progress: 'Progress',    // Optional: number property (0-100)
  dueDate: 'Deadline',     // Optional: date property
  tags: 'Tags',            // Optional: multi-select property
};

const mappingDescriptions: Record<string, string> = {
  title: 'Auto-detected (your title column)',
  type: 'Item type (Mission, Problem, etc.)',
  status: 'Status column name',
  priority: 'Priority level (P0-P3)',
  owner: 'Person/Owner column',
  parent: 'Parent relation column',
  progress: 'Progress % (number)',
  dueDate: 'Due date / Deadline',
  tags: 'Tags (multi-select)',
};

const NotionConfigModal: React.FC<NotionConfigModalProps> = ({ isOpen, onClose, onConnect }) => {
  const { setNotionConfig, notionConfig } = useStore();
  const [apiKey, setApiKey] = useState(notionConfig?.apiKey || '');
  const [databaseId, setDatabaseId] = useState(notionConfig?.databaseId || '');
  const [mappings, setMappings] = useState(notionConfig?.mappings || defaultMappings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);

    const config: NotionConfig = {
      apiKey,
      databaseId,
      mappings,
    };

    // Save config - the App will handle loading
    setNotionConfig(config);
    setIsConnecting(false);
    onConnect();
    onClose();
  };

  const handleDisconnect = () => {
    setNotionConfig(null);
    setApiKey('');
    setDatabaseId('');
    setMappings(defaultMappings);
    onConnect();
    onClose();
  };

  const handleUseDemoData = () => {
    setNotionConfig(null);
    onConnect();
    onClose();
  };

  if (!isOpen) return null;

  const isConnected = notionConfig && notionConfig.apiKey && notionConfig.databaseId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">N</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connect to Notion</h2>
              <p className="text-sm text-gray-500">Configure your Notion integration</p>
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
            </p>
          </div>

          {/* Database ID */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Database className="w-4 h-4" />
              Database ID
            </label>
            <input
              type="text"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-xs text-gray-500">
              Copy the database ID from your Notion database URL. Make sure to share the database with your integration.
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
                  Match these to your Notion database column names. Title is auto-detected.
                  Leave others blank if you don't have them.
                </p>
                {Object.entries(mappings).map(([key, value]) => (
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
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  <strong>Tip:</strong> Check your Notion database column names and enter them exactly as shown (case-insensitive).
                </p>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This app uses a CORS proxy to connect to the Notion API from the browser.
              For production use, you should set up your own backend proxy for security.
            </p>
          </div>

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!apiKey || !databaseId || isConnecting}
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
