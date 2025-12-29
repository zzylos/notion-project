import React, { memo } from 'react';
import { Loader2, AlertTriangle, X, ChevronUp, ChevronDown } from 'lucide-react';
import StatsOverview from './StatsOverview';

interface LoadingProgress {
  loaded: number;
  total: number | null;
}

interface FailedDatabase {
  type: string;
  error: string;
}

/**
 * Loading progress bar with shimmer animation
 */
interface LoadingProgressBarProps {
  progress: LoadingProgress | null;
}

export const LoadingProgressBar: React.FC<LoadingProgressBarProps> = memo(({ progress }) => {
  const hasProgress = progress && progress.loaded > 0;
  const progressPercent =
    progress?.total && progress.loaded > 0
      ? Math.min(100, (progress.loaded / progress.total) * 100)
      : 100;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        <span className="text-sm text-blue-700">
          {hasProgress ? (
            <>
              Loading items from Notion... {progress.loaded} items loaded
              {progress.total && ` of ~${progress.total}`}
            </>
          ) : (
            'Loading data from Notion...'
          )}
        </span>
      </div>
      <div className="mt-1 w-full h-1 bg-blue-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          style={{
            width: hasProgress ? `${progressPercent}%` : '100%',
            backgroundSize: '200% 100%',
            animation: hasProgress ? 'none' : 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
});

LoadingProgressBar.displayName = 'LoadingProgressBar';

/**
 * Warning banner for failed database loads
 */
interface FailedDatabasesWarningProps {
  databases: FailedDatabase[];
  onDismiss: () => void;
}

export const FailedDatabasesWarning: React.FC<FailedDatabasesWarningProps> = memo(
  ({ databases, onDismiss }) => (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-amber-800">Some databases failed to load</span>
          <ul className="mt-1 text-xs text-amber-700">
            {databases.map((db, i) => (
              <li key={i}>
                <span className="font-medium capitalize">{db.type}</span>: {db.error}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
);

FailedDatabasesWarning.displayName = 'FailedDatabasesWarning';

/**
 * Collapsible stats overview section
 */
interface StatsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const StatsToggle: React.FC<StatsToggleProps> = memo(({ isOpen, onToggle }) => (
  <div className="border-b border-gray-200 bg-white">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <span className="text-sm font-medium text-gray-700">Statistics Overview</span>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-500" />
      )}
    </button>
    {isOpen && <StatsOverview />}
  </div>
));

StatsToggle.displayName = 'StatsToggle';
