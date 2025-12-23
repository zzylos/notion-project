import { AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { VIEW_LIMITS } from '../../constants';

interface ItemLimitBannerProps {
  /** Total number of items before limiting */
  totalItems: number;
  /** Number of items being displayed (after limit) */
  displayedItems: number;
}

/**
 * Banner that shows when items are being limited for performance.
 * Displays a warning with the option to show all items.
 */
export const ItemLimitBanner: React.FC<ItemLimitBannerProps> = ({ totalItems, displayedItems }) => {
  const { disableItemLimit, setDisableItemLimit } = useStore();

  // Don't show if limit is disabled or we're showing all items
  if (disableItemLimit || totalItems <= VIEW_LIMITS.ITEM_LIMIT) {
    return null;
  }

  const hiddenCount = totalItems - displayedItems;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            Showing {displayedItems.toLocaleString()} of {totalItems.toLocaleString()} items for
            performance.
            <span className="text-amber-600 ml-1">({hiddenCount.toLocaleString()} hidden)</span>
          </span>
        </div>
        <button
          onClick={() => setDisableItemLimit(true)}
          className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors whitespace-nowrap"
        >
          Show All Items
        </button>
      </div>
    </div>
  );
};

export default ItemLimitBanner;
