import { useMemo, useCallback, memo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import TreeNode from './TreeNode';
import { useStore } from '../../store/useStore';
import type { TreeNode as TreeNodeType } from '../../types';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';

interface TreeViewProps {
  onNodeSelect?: (id: string) => void;
}

const TreeView: React.FC<TreeViewProps> = memo(({ onNodeSelect }) => {
  const {
    getTreeNodes,
    expandAll,
    collapseAll,
    expandedIds,
    isLoading,
  } = useStore();

  const treeNodes = useMemo(() => getTreeNodes(), [getTreeNodes]);

  // Memoize handleNodeClick to prevent TreeNode re-renders
  const handleNodeClick = useCallback((id: string) => {
    onNodeSelect?.(id);
  }, [onNodeSelect]);

  const totalNodes = useMemo(() => {
    const countNodes = (nodes: TreeNodeType[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
    };
    return countNodes(treeNodes);
  }, [treeNodes]);

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
      {/* Tree header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{totalNodes}</span>
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
          {treeNodes.map((node) => (
            <TreeNode key={node.item.id} node={node} onNodeClick={handleNodeClick} />
          ))}
        </div>
      </div>
    </div>
  );
});

TreeView.displayName = 'TreeView';

export default TreeView;
