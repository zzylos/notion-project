import { useMemo } from 'react';
import { Maximize2, Minimize2, RefreshCw, Search } from 'lucide-react';
import TreeNode from './TreeNode';
import { useStore } from '../../store/useStore';
import type { TreeNode as TreeNodeType } from '../../types';

interface TreeViewProps {
  onNodeSelect?: (id: string) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ onNodeSelect }) => {
  const {
    getTreeNodes,
    expandAll,
    collapseAll,
    expandedIds,
    items,
    isLoading,
    filters,
  } = useStore();

  const treeNodes = useMemo(() => getTreeNodes(), [items, expandedIds, filters]);

  const handleNodeClick = (id: string) => {
    onNodeSelect?.(id);
  };

  const totalNodes = useMemo(() => {
    const countNodes = (nodes: TreeNodeType[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
    };
    return countNodes(treeNodes);
  }, [treeNodes]);

  const isAllExpanded = expandedIds.size >= items.size - treeNodes.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Loading opportunity tree...</span>
      </div>
    );
  }

  if (treeNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Search className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm">Try adjusting your filters or search query</p>
      </div>
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
};

export default TreeView;
