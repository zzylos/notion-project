import { memo } from 'react';
import { TreeDeciduous, LayoutGrid, Settings, Network } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ViewMode } from '../../types';

interface HeaderProps {
  onOpenSettings: () => void;
}

const viewModeConfig: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'tree', icon: TreeDeciduous, label: 'Tree' },
  { mode: 'canvas', icon: Network, label: 'Canvas' },
  { mode: 'kanban', icon: LayoutGrid, label: 'Kanban' },
];

const Header: React.FC<HeaderProps> = memo(({ onOpenSettings }) => {
  const { viewMode, setViewMode } = useStore();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Opportunity Tree</h1>
        </div>

        {/* View mode selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {viewModeConfig.map(({ mode, icon: Icon, label }) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
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
});

Header.displayName = 'Header';

export default Header;
