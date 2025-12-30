import React from 'react';
import { Target } from 'lucide-react';

/**
 * Empty state shown when no item is selected.
 */
const EmptyState: React.FC = () => (
  <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
    <div>
      <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium">Select an item</p>
      <p className="text-sm mt-1">Click on any item in the tree to see its details</p>
    </div>
  </div>
);

EmptyState.displayName = 'DetailEmptyState';

export default EmptyState;
