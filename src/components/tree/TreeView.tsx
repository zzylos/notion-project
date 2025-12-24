import { useMemo, useCallback, memo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import TreeNode from './TreeNode';
import { useStore } from '../../store/useStore';
import { VIEW_LIMITS } from '../../constants';
import type { TreeNode as TreeNodeType } from '../../types';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ItemLimitBanner from '../ui/ItemLimitBanner';

interface TreeViewProps {
  onNodeSelect?: (id: string) => void;
}

const TreeView: React.FC<TreeViewProps> = memo(({ onNodeSelect }) => {
  const {
    getTreeNodes,
    getFilteredItems,
    expandAll,
    collapseAll,
    expandedIds,
    isLoading,
    disableItemLimit,
  } = useStore();

  // Get full tree for display
  const allTreeNodes = useMemo(() => getTreeNodes(), [getTreeNodes]);

  // Get total item count for limit check
  const totalFilteredCount = useMemo(() => getFilteredItems().length, [getFilteredItems]);

  // Determine if we should limit and how many root nodes to show
  // Also computes totalNodes to avoid duplicate traversal
  const { treeNodes, isLimited, displayedCount, totalNodes } = useMemo(() => {
    // Helper function to count all nodes in a tree - defined inside useMemo to satisfy exhaustive-deps
    const countNodesInTree = (node: TreeNodeType): number => {
      return 1 + node.children.reduce((acc, child) => acc + countNodesInTree(child), 0);
    };

    // Calculate total node count once
    const total = allTreeNodes.reduce((acc, node) => acc + countNodesInTree(node), 0);

    const shouldLimit = !disableItemLimit && totalFilteredCount > VIEW_LIMITS.ITEM_LIMIT;

    if (!shouldLimit) {
      return {
        treeNodes: allTreeNodes,
        isLimited: false,
        displayedCount: total,
        totalNodes: total,
      };
    }

    // Limit by counting nodes and stopping when we reach the limit
    let count = 0;
    const limitedNodes: TreeNodeType[] = [];

    for (const node of allTreeNodes) {
      const nodeCount = countNodesInTree(node);
      if (count + nodeCount <= VIEW_LIMITS.ITEM_LIMIT) {
        limitedNodes.push(node);
        count += nodeCount;
      } else if (count < VIEW_LIMITS.ITEM_LIMIT) {
        // Add partial tree (just this node without children to stay under limit)
        limitedNodes.push({ ...node, children: [] });
        count += 1;
        break;
      } else {
        break;
      }
    }

    return {
      treeNodes: limitedNodes,
      isLimited: true,
      displayedCount: count,
      totalNodes: total,
    };
  }, [allTreeNodes, totalFilteredCount, disableItemLimit]);

  // Memoize handleNodeClick to prevent TreeNode re-renders
  const handleNodeClick = useCallback(
    (id: string) => {
      onNodeSelect?.(id);
    },
    [onNodeSelect]
  );

  // For display, use displayedCount when limited, otherwise totalNodes
  // Both are now computed together in the useMemo above to avoid duplicate tree traversal
  const displayCount = isLimited ? displayedCount : totalNodes;

  // Collect IDs of expandable items (items with children) in the current tree view
  const expandableIds = useMemo(() => {
    const ids: string[] = [];
    const collectExpandable = (nodes: TreeNodeType[]): void => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          ids.push(node.item.id);
          collectExpandable(node.children);
        }
      });
    };
    collectExpandable(treeNodes);
    return ids;
  }, [treeNodes]);

  // Check if all expandable items are actually expanded
  const isAllExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id));

  if (isLoading) {
    return <LoadingState message="Loading opportunity tree..." size="lg" className="h-64" />;
  }

  if (treeNodes.length === 0) {
    return (
      <EmptyState
        variant="filter"
        title="No items found"
        description="Try adjusting your filters or search query"
        className="h-64"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Item limit warning banner */}
      {isLimited && (
        <ItemLimitBanner totalItems={totalFilteredCount} displayedItems={displayCount} />
      )}

      {/* Tree header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{displayCount}</span>
          <span>items in tree</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isAllExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title={isAllExpanded ? 'Collapse all' : 'Expand all'}
          >
            {isAllExpanded ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-0.5">
          {treeNodes.map(node => (
            <TreeNode key={node.item.id} node={node} onNodeClick={handleNodeClick} />
          ))}
        </div>
      </div>
    </div>
  );
});

TreeView.displayName = 'TreeView';

export default TreeView;
