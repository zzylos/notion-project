import React from 'react';
import {
  TreeDeciduous,
  LayoutGrid,
  List,
  Calendar,
  RefreshCw,
  Settings,
  Network,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ViewMode } from '../../types';

interface HeaderProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Remaining cooldown time in milliseconds before next refresh is allowed */
  refreshCooldownRemaining?: number;
  /** Whether the app is currently using demo/sample data instead of real Notion data */
  isUsingDemoData?: boolean;
}

/**
 * Format milliseconds to a human-readable time string (e.g., "1:30")
 */
const formatCooldownTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const viewModeIcons: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  tree: TreeDeciduous,
  canvas: Network,
  kanban: LayoutGrid,
  list: List,
  timeline: Calendar,
};

const viewModeLabels: Record<ViewMode, string> = {
  tree: 'Tree',
  canvas: 'Canvas',
  kanban: 'Kanban',
  list: 'List',
  timeline: 'Timeline',
};

const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onRefresh,
  isRefreshing,
  refreshCooldownRemaining = 0,
  isUsingDemoData = false,
}) => {
  const { viewMode, setViewMode } = useStore();
  const isOnCooldown = refreshCooldownRemaining > 0;
  const isRefreshDisabled = isRefreshing || isOnCooldown;

  // Determine connection status based on actual data source
  // (isUsingDemoData already accounts for whether config is valid and data loaded successfully)
  const isConnectedToNotion = !isUsingDemoData;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Opportunity Tree</h1>
            <p className="text-xs text-gray-500">HouseSigma Work Visualization</p>
          </div>
        </div>

        {/* View mode selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.keys(viewModeIcons) as ViewMode[]).map(mode => {
            const Icon = viewModeIcons[mode];
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-all duration-150
                  ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title={viewModeLabels[mode]}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{viewModeLabels[mode]}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            {isConnectedToNotion ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">Connected to Notion</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600">Using demo data</span>
              </>
            )}
          </div>

          {/* Refresh button with cooldown indicator */}
          <div className="relative">
            <button
              onClick={onRefresh}
              disabled={isRefreshDisabled}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors
                ${
                  isOnCooldown
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isRefreshing
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
              title={
                isOnCooldown
                  ? `Rate limited - refresh available in ${formatCooldownTime(refreshCooldownRemaining)}`
                  : isRefreshing
                    ? 'Refreshing...'
                    : 'Refresh data from Notion'
              }
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isOnCooldown && (
                <span className="text-xs font-medium tabular-nums">
                  {formatCooldownTime(refreshCooldownRemaining)}
                </span>
              )}
            </button>
            {/* Cooldown badge for visibility */}
            {isOnCooldown && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
