import { memo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { FilterMode } from '../../types';

interface FilterModeToggleProps {
  mode: FilterMode;
  onToggle: () => void;
  visible: boolean;
}

const FilterModeToggle: React.FC<FilterModeToggleProps> = memo(({ mode, onToggle, visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        focus:outline-none focus:ring-2 focus:ring-offset-1
        ${
          mode === 'hide'
            ? 'bg-red-100 text-red-700 border border-red-300 focus:ring-red-500'
            : 'bg-green-100 text-green-700 border border-green-300 focus:ring-green-500'
        }
      `}
      title={
        mode === 'hide'
          ? 'Hide mode: Selected filters hide matching items'
          : 'Show mode: Selected filters show only matching items'
      }
      aria-pressed={mode === 'hide'}
    >
      {mode === 'hide' ? (
        <>
          <EyeOff className="w-4 h-4" />
          Hide
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          Show
        </>
      )}
    </button>
  );
});

FilterModeToggle.displayName = 'FilterModeToggle';

export default FilterModeToggle;
