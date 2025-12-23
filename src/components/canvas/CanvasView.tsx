import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store/useStore';
import { useItemLimit } from '../../hooks/useItemLimit';
import type { WorkItem } from '../../types';
import { typeHexColors } from '../../utils/colors';
import { calculateLayout } from '../../utils/layoutCalculator';
import CanvasNode from './CanvasNode';
import CanvasLegend from './CanvasLegend';
import CanvasControls from './CanvasControls';
import ItemLimitBanner from '../ui/ItemLimitBanner';

// Custom node types
const nodeTypes = {
  workItem: CanvasNode,
};

interface CanvasViewProps {
  onNodeSelect?: (id: string) => void;
}

// Inner component that uses React Flow hooks
const CanvasViewInner: React.FC<CanvasViewProps> = ({ onNodeSelect }) => {
  const { getFilteredItems, setSelectedItem, selectedItemId, hideOrphanItems, setHideOrphanItems, items } = useStore();
  const allFilteredItems = getFilteredItems();
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const fitViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const handleToggleOrphanItems = useCallback(() => {
    setHideOrphanItems(!hideOrphanItems);
  }, [hideOrphanItems, setHideOrphanItems]);

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  // Calculate connected items for the selected item
  // This collects ALL ancestors and ALL descendants recursively, not just immediate parent/children
  // Calculated independently of focusMode so we can use it to include items outside filters
  const connectedItemIds = useMemo(() => {
    if (!selectedItemId) return null;

    const selectedItem = items.get(selectedItemId);
    if (!selectedItem) return null;

    const connected = new Set<string>([selectedItemId]);

    // Recursively add all ancestors (parent, grandparent, etc.)
    const addAncestors = (itemId: string) => {
      const item = items.get(itemId);
      if (item?.parentId && !connected.has(item.parentId)) {
        connected.add(item.parentId);
        addAncestors(item.parentId);
      }
    };
    addAncestors(selectedItemId);

    // Recursively add all descendants (children, grandchildren, etc.)
    const addDescendants = (itemId: string) => {
      const item = items.get(itemId);
      if (item?.children) {
        for (const childId of item.children) {
          if (!connected.has(childId)) {
            connected.add(childId);
            addDescendants(childId);
          }
        }
      }
    };
    addDescendants(selectedItemId);

    // Add blocked by items
    if (selectedItem.blockedBy) {
      selectedItem.blockedBy.forEach(blockerId => connected.add(blockerId));
    }

    // Find items that this item blocks (reverse lookup)
    for (const item of items.values()) {
      if (item.blockedBy?.includes(selectedItemId)) {
        connected.add(item.id);
      }
    }

    // Find siblings (items with same parent)
    if (selectedItem.parentId) {
      for (const item of items.values()) {
        if (item.parentId === selectedItem.parentId) {
          connected.add(item.id);
        }
      }
    }

    return connected;
  }, [selectedItemId, items]);

  // Calculate which items are orphans and determine final filtered items
  // When focus mode is ON, include connected items even if they're outside filters
  const { itemsAfterOrphanFilter, orphanCount } = useMemo(() => {
    // Start with filtered items
    let baseItems = allFilteredItems;

    // When focus mode is active, add connected items that are outside the filter
    if (focusMode && connectedItemIds) {
      const filteredIds = new Set(allFilteredItems.map(i => i.id));
      const additionalItems: WorkItem[] = [];

      for (const connectedId of connectedItemIds) {
        if (!filteredIds.has(connectedId)) {
          const item = items.get(connectedId);
          if (item) {
            additionalItems.push(item);
          }
        }
      }

      if (additionalItems.length > 0) {
        baseItems = [...allFilteredItems, ...additionalItems];
      }
    }

    const itemIds = new Set(baseItems.map(i => i.id));
    const itemsWithChildren = new Set<string>();

    // Find all items that have children
    for (const item of baseItems) {
      if (item.parentId && itemIds.has(item.parentId)) {
        itemsWithChildren.add(item.parentId);
      }
    }

    // An orphan is an item with no parent (in set) AND no children
    const orphans = baseItems.filter(item => {
      const hasParentInSet = item.parentId && itemIds.has(item.parentId);
      const hasChildren = itemsWithChildren.has(item.id);
      return !hasParentInSet && !hasChildren;
    });

    // Don't hide orphans when focus mode is active (connected items might appear as orphans)
    if (hideOrphanItems && !focusMode) {
      const orphanIds = new Set(orphans.map(o => o.id));
      return {
        itemsAfterOrphanFilter: baseItems.filter(item => !orphanIds.has(item.id)),
        orphanCount: orphans.length,
      };
    }

    return {
      itemsAfterOrphanFilter: baseItems,
      orphanCount: orphans.length,
    };
  }, [allFilteredItems, hideOrphanItems, focusMode, connectedItemIds, items]);

  // Apply item limit for performance
  const { limitedItems: filteredItems, totalCount, isLimited } = useItemLimit(itemsAfterOrphanFilter);

  // Handle fullscreen changes (including ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen mode
  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error: unknown) {
      // Handle specific fullscreen errors
      if (error instanceof Error) {
        // SecurityError or NotAllowedError - fullscreen not permitted
        if (error.name === 'SecurityError' || error.name === 'NotAllowedError') {
          console.warn('[Canvas] Fullscreen not allowed:', error.message);
          return;
        }
        // TypeError - fullscreen API not supported
        if (error.name === 'TypeError') {
          console.warn('[Canvas] Fullscreen API not supported');
          return;
        }
        // Log unexpected errors for debugging
        console.error('[Canvas] Unexpected fullscreen error:', error);
      }
    }
  }, []);

  // Track the data key to detect when underlying data changes
  const dataKey = useMemo(
    () => filteredItems.map(i => i.id).sort().join(','),
    [filteredItems]
  );
  const prevDataKeyRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Calculate layout based on current data
  const currentLayout = useMemo(
    () => calculateLayout(filteredItems, selectedItemId),
    [filteredItems, selectedItemId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(currentLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentLayout.edges);

  // Update when underlying data changes (new items added/removed)
  // Skip the initial mount since we already have the correct layout
  // Note: setNodes and setEdges are stable from React Flow hooks, so not included in deps
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDataKeyRef.current = dataKey;
      return;
    }

    if (prevDataKeyRef.current !== dataKey) {
      const newLayout = calculateLayout(filteredItems, selectedItemId);
      setNodes(newLayout.nodes);
      setEdges(newLayout.edges);
      prevDataKeyRef.current = dataKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, filteredItems, selectedItemId]);

  // Update node selection and connection state without resetting positions
  // Note: setNodes is stable from React Flow hooks, so not included in deps
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => {
        const isConnected = connectedItemIds ? connectedItemIds.has(node.id) : true;
        const isDimmed = focusMode && selectedItemId && !isConnected;
        return {
          ...node,
          data: {
            ...node.data,
            isSelected: node.id === selectedItemId,
            isConnected,
            isDimmed,
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, connectedItemIds, focusMode]);

  // Reset layout to original positions
  // Note: setNodes/setEdges are stable from React Flow hooks
  const handleResetLayout = useCallback(() => {
    const newLayout = calculateLayout(filteredItems, selectedItemId);
    setNodes(newLayout.nodes);
    setEdges(newLayout.edges);
    // Fit view after a short delay to allow nodes to update (clear any existing timeout first)
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }
    fitViewTimeoutRef.current = setTimeout(() => fitView({ padding: 0.2 }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, selectedItemId, fitView]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
    };
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedItem(node.id);
      onNodeSelect?.(node.id);
    },
    [setSelectedItem, onNodeSelect]
  );

  // Minimap node color based on type
  const nodeColor = useCallback((node: Node) => {
    const item = node.data?.item as WorkItem;
    return item ? typeHexColors[item.type] : '#94a3b8';
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-50 flex flex-col">
      {/* Item limit warning banner */}
      {isLimited && (
        <ItemLimitBanner totalItems={totalCount} displayedItems={filteredItems.length} />
      )}

      <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white border border-gray-200 rounded-lg"
        />

        {/* Legend */}
        <CanvasLegend />

        {/* Action buttons */}
        <CanvasControls
          onResetLayout={handleResetLayout}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
          hideOrphanItems={hideOrphanItems}
          onToggleOrphanItems={handleToggleOrphanItems}
          orphanCount={orphanCount}
          focusMode={focusMode}
          onToggleFocusMode={handleToggleFocusMode}
          hasSelection={!!selectedItemId}
        />

        {/* Instructions */}
        <Panel position="bottom-left" className="bg-white/90 px-3 py-2 rounded-lg text-xs text-gray-500">
          Drag nodes to reorganize • Scroll to zoom • Click nodes to select
        </Panel>
      </ReactFlow>
      </div>
    </div>
  );
};

// Wrapper component that provides ReactFlowProvider
const CanvasView: React.FC<CanvasViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasViewInner {...props} />
    </ReactFlowProvider>
  );
};

export default CanvasView;
