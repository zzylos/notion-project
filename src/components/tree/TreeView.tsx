import { useMemo, useCallback, memo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import TreeNode from './TreeNode';
import { useStore } from '../../store/useStore';
import type { TreeNode as TreeNodeType } from '../../types';

const TreeView: React.FC = memo(() => {
  const { getTreeNodes, expandAll, collapseAll, expandedIds, isLoading, filters } = useStore();

  // Include filters in dependencies to ensure recalculation when filters change
  const treeNodes = useMemo(() => getTreeNodes(), [getTreeNodes, expandedIds, filters]);

  // Check if all expandable items are expanded
  const expandableIds = useMemo(() => {
    const ids: string[] = [];
    const collect = (nodes: TreeNodeType[]): void => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          ids.push(node.item.id);
          collect(node.children);
        }
      });
    };
    collect(treeNodes);
    return ids;
  }, [treeNodes]);

  const isAllExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id));

  const handleNodeClick = useCallback(() => {
    // Node click handling - selection is done in TreeNode
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (treeNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No items found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tree header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{treeNodes.length}</span> root items
        </div>
        <button
          onClick={isAllExpanded ? collapseAll : expandAll}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
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
