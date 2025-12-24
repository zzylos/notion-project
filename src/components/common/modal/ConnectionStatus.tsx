import React from 'react';
import { CheckCircle2, Unplug } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  configUIDisabled: boolean;
  onDisconnect: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  configUIDisabled,
  onDisconnect,
}) => {
  if (!isConnected) return null;

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Connected to Notion</span>
        </div>
        {!configUIDisabled && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Unplug className="w-4 h-4" />
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
