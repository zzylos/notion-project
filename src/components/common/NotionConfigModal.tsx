import React, { useState } from 'react';
import { X, Key, Database, Settings, HelpCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NotionConfig } from '../../types';

interface NotionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

const defaultMappings = {
  title: 'Name',
  type: 'Type',
  status: 'Status',
  priority: 'Priority',
  owner: 'Owner',
  parent: 'Parent',
  progress: 'Progress',
  dueDate: 'Due Date',
  tags: 'Tags',
};

const NotionConfigModal: React.FC<NotionConfigModalProps> = ({ isOpen, onClose, onConnect }) => {
  const { setNotionConfig, notionConfig } = useStore();
  const [apiKey, setApiKey] = useState(notionConfig?.apiKey || '');
  const [databaseId, setDatabaseId] = useState(notionConfig?.databaseId || '');
  const [mappings, setMappings] = useState(notionConfig?.mappings || defaultMappings);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config: NotionConfig = {
      apiKey,
      databaseId,
      mappings,
    };

    setNotionConfig(config);
    onConnect();
    onClose();
  };

  const handleUseDemoData = () => {
    onClose();
    onConnect();
  };

  if (!isOpen) return null;

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
              Copy the database ID from your Notion database URL
            </p>
          </div>

          {/* Advanced: Property Mappings */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" />
              Property Mappings
              <span className="text-xs text-gray-500">(optional)</span>
            </button>

            {showAdvanced && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <p className="text-xs text-gray-600">
                  Map your Notion database properties to the visualization fields:
                </p>
                {Object.entries(mappings).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="w-24 text-xs font-medium text-gray-600 capitalize">
                      {key}:
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setMappings((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!apiKey || !databaseId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Connect to Notion
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
