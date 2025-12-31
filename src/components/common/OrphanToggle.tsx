import React, { memo } from 'react';
import { Unlink } from 'lucide-react';
import { useStore } from '../../store/useStore';

/**
 * Floating button to toggle showing only orphan items.
 * Shows the count of orphan items and allows toggling between:
 * - Normal mode: orphans are hidden
 * - Orphan mode: only orphans are shown
 */
const OrphanToggle: React.FC = memo(() => {
  const { showOnlyOrphans, toggleOrphanMode, getOrphanCount } = useStore();
  const orphanCount = getOrphanCount();

  // Don't show the button if there are no orphans
  if (orphanCount === 0) {
    return null;
  }

  return (
    <button
      onClick={toggleOrphanMode}
      className={`
        flex items-center gap-2 px-3 py-2
        rounded-lg shadow-lg border text-sm transition-colors
        ${
          showOnlyOrphans
            ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }
      `}
      title={
        showOnlyOrphans
          ? 'Click to hide orphan items and show connected items'
          : `Click to show only orphan items (${orphanCount} unconnected items)`
      }
      aria-label={showOnlyOrphans ? 'Show connected items' : 'Show orphan items'}
      aria-pressed={showOnlyOrphans}
    >
      <Unlink className="w-4 h-4" />
      <span className="hidden sm:inline">{showOnlyOrphans ? 'Showing Orphans' : 'Orphans'}</span>
      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 rounded-full">
        {orphanCount}
      </span>
    </button>
  );
});

OrphanToggle.displayName = 'OrphanToggle';

export default OrphanToggle;
