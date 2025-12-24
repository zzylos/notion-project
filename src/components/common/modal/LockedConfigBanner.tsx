import React from 'react';
import { Lock, FileCode } from 'lucide-react';

interface LockedConfigBannerProps {
  usingEnvConfig: boolean;
}

const LockedConfigBanner: React.FC<LockedConfigBannerProps> = ({ usingEnvConfig }) => {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-lg">
      <Lock className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-slate-800">Configuration Managed by Server</h3>
        <p className="text-sm text-slate-600 mt-1">
          Notion API settings are configured via environment variables and cannot be modified
          through this interface. Contact your administrator to change these settings.
        </p>
        {usingEnvConfig && (
          <div className="flex items-center gap-2 mt-3 text-xs text-green-700">
            <FileCode className="w-4 h-4" />
            <span>
              Configuration loaded from{' '}
              <code className="px-1 py-0.5 bg-green-100 rounded">.env</code> file
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LockedConfigBanner;
