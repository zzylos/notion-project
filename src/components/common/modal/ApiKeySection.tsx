import { Key, HelpCircle } from 'lucide-react';

interface ApiKeySectionProps {
  apiKey: string;
  onChange: (value: string) => void;
}

/**
 * ApiKeySection handles the Notion API key input in the config modal.
 */
const ApiKeySection: React.FC<ApiKeySectionProps> = ({ apiKey, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Key className="w-4 h-4" />
        Notion API Key
        <a
          href="https://www.notion.so/my-integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600"
          aria-label="Learn how to create a Notion integration"
        >
          <HelpCircle className="w-4 h-4" />
        </a>
      </label>
      <input
        type="password"
        value={apiKey}
        onChange={e => onChange(e.target.value)}
        placeholder="secret_..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        aria-label="Notion API key"
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
        </a>{' '}
        and share all databases with it.
      </p>
    </div>
  );
};

export default ApiKeySection;
