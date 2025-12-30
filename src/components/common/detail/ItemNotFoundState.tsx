import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ItemNotFoundStateProps {
  onClose: () => void;
}

/**
 * State shown when the selected item is no longer available.
 */
const ItemNotFoundState: React.FC<ItemNotFoundStateProps> = ({ onClose }) => (
  <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
    <div>
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
      <p className="text-lg font-medium text-gray-600">Item not found</p>
      <p className="text-sm mt-1 text-gray-500">
        This item may have been deleted or is no longer available
      </p>
      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        Clear selection
      </button>
    </div>
  </div>
);

ItemNotFoundState.displayName = 'ItemNotFoundState';

export default ItemNotFoundState;
