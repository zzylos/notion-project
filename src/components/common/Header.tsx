import React from 'react';
import {
  TreeDeciduous,
  LayoutGrid,
  Calendar,
  Settings,
  Network,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ViewMode } from '../../types';

interface HeaderProps {
  onOpenSettings: () => void;
}

const viewModeIcons: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  tree: TreeDeciduous,
  canvas: Network,
  kanban: LayoutGrid,
  timeline: Calendar,
};

const viewModeLabels: Record<ViewMode, string> = {
  tree: 'Tree',
  canvas: 'Canvas',
  kanban: 'Kanban',
  timeline: 'Timeline',
};

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { viewMode, setViewMode } = useStore();

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

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
