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
import { useItemLimit, useFullscreen } from '../../hooks';
import type { WorkItem } from '../../types';
import { typeHexColors } from '../../utils/colors';
import { calculateLayout } from '../../utils/layoutCalculator';
import CanvasNode from './CanvasNode';
import CanvasLegend from './CanvasLegend';
import CanvasControls from './CanvasControls';
import ItemLimitBanner from '../ui/ItemLimitBanner';

/**
 * Collect all ancestors of an item (iterative to avoid stack overflow)
 */
function collectAncestors(
  startId: string | undefined,
  items: Map<string, WorkItem>,
  connected: Set<string>
): void {
  let currentId = startId;
  while (currentId && !connected.has(currentId)) {
    connected.add(currentId);
    currentId = items.get(currentId)?.parentId;
  }
}

/**
 * Collect all descendants of an item using BFS
 */
function collectDescendants(
  children: string[] | undefined,
  items: Map<string, WorkItem>,
  connected: Set<string>
): void {
  const queue = children ? [...children] : [];
  while (queue.length > 0) {
    const childId = queue.shift()!;
    if (!connected.has(childId)) {
      connected.add(childId);
      const child = items.get(childId);
      if (child?.children) queue.push(...child.children);
    }
  }
}

/**
 * Build the set of connected item IDs for focus mode
 */
function buildConnectedIds(
  selectedItemId: string,
  items: Map<string, WorkItem>
): Set<string> | null {
  const selectedItem = items.get(selectedItemId);
  if (!selectedItem) return null;

  const connected = new Set<string>([selectedItemId]);

  collectAncestors(selectedItem.parentId, items, connected);
  collectDescendants(selectedItem.children, items, connected);

  // Add blocked by items
  selectedItem.blockedBy?.forEach(id => connected.add(id));

  // Find items that this item blocks
  for (const item of items.values()) {
    if (item.blockedBy?.includes(selectedItemId)) {
      connected.add(item.id);
    }
  }

  // Add siblings
  if (selectedItem.parentId) {
    const parent = items.get(selectedItem.parentId);
    parent?.children?.forEach(id => connected.add(id));
  }

  return connected;
}

/**
 * Filter orphan items from the list
 */
function filterOrphans(
  items: WorkItem[],
  hideOrphanItems: boolean,
  focusMode: boolean
): { filtered: WorkItem[]; orphanCount: number } {
  const itemIds = new Set(items.map(i => i.id));
  const itemsWithChildren = new Set<string>();

  for (const item of items) {
    if (item.parentId && itemIds.has(item.parentId)) {
      itemsWithChildren.add(item.parentId);
    }
  }

  const orphans = items.filter(item => {
    const hasParentInSet = item.parentId && itemIds.has(item.parentId);
    const hasChildren = itemsWithChildren.has(item.id);
    return !hasParentInSet && !hasChildren;
  });

  if (hideOrphanItems && !focusMode) {
    const orphanIds = new Set(orphans.map(o => o.id));
    return {
      filtered: items.filter(item => !orphanIds.has(item.id)),
      orphanCount: orphans.length,
    };
  }

  return { filtered: items, orphanCount: orphans.length };
}

// Custom node types
const nodeTypes = {
  workItem: CanvasNode,
};

interface CanvasViewProps {
  onNodeSelect?: (id: string) => void;
}

// Inner component that uses React Flow hooks
const CanvasViewInner: React.FC<CanvasViewProps> = ({ onNodeSelect }) => {
  const {
    getFilteredItems,
    setSelectedItem,
    selectedItemId,
    hideOrphanItems,
    setHideOrphanItems,
    items,
  } = useStore();
  const allFilteredItems = getFilteredItems();
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const fitViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const [focusMode, setFocusMode] = useState(false);

  // Track the item that was selected when focus mode was enabled
  // This keeps the item set stable while navigating within focus mode
  const [focusModeAnchorId, setFocusModeAnchorId] = useState<string | null>(null);

  const handleToggleOrphanItems = useCallback(() => {
    setHideOrphanItems(!hideOrphanItems);
  }, [hideOrphanItems, setHideOrphanItems]);

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const newFocusMode = !prev;
      // When enabling focus mode, anchor to the current selection
      if (newFocusMode && selectedItemId) {
        setFocusModeAnchorId(selectedItemId);
      } else {
        setFocusModeAnchorId(null);
      }
      return newFocusMode;
    });
  }, [selectedItemId]);

  // Calculate connected items for the ANCHOR item (stable during focus mode navigation)
  // This determines which items are displayed in the canvas
  const anchorConnectedItemIds = useMemo(() => {
    if (!focusModeAnchorId) return null;
    return buildConnectedIds(focusModeAnchorId, items);
  }, [focusModeAnchorId, items]);

  // Calculate connected items for the currently selected item
  // This determines which items are highlighted vs dimmed
  const selectedConnectedItemIds = useMemo(() => {
    if (!selectedItemId) return null;
    return buildConnectedIds(selectedItemId, items);
  }, [selectedItemId, items]);

  // Calculate which items are orphans and determine final filtered items
  // Use anchorConnectedItemIds for determining which items to show (stable set)
  const { itemsAfterOrphanFilter, orphanCount } = useMemo(() => {
    let baseItems = allFilteredItems;

    // When focus mode is active, add connected items that are outside the filter
    // Use the anchor's connected items to keep the item set stable
    if (focusMode && anchorConnectedItemIds) {
      const filteredIds = new Set(allFilteredItems.map(i => i.id));
      const additionalItems = [...anchorConnectedItemIds]
        .filter(id => !filteredIds.has(id))
        .map(id => items.get(id))
        .filter((item): item is WorkItem => item !== undefined);

      if (additionalItems.length > 0) {
        baseItems = [...allFilteredItems, ...additionalItems];
      }
    }

    const { filtered, orphanCount } = filterOrphans(baseItems, hideOrphanItems, focusMode);
    return { itemsAfterOrphanFilter: filtered, orphanCount };
  }, [allFilteredItems, hideOrphanItems, focusMode, anchorConnectedItemIds, items]);

  // Apply item limit for performance (bypass when in focus mode to ensure all connected items are visible)
  const { limitedItems, totalCount, isLimited } = useItemLimit(itemsAfterOrphanFilter);

  // When focus mode is active, use all items (no limit) to ensure connected items are visible
  const filteredItems = focusMode && focusModeAnchorId ? itemsAfterOrphanFilter : limitedItems;
  const showLimitBanner = focusMode && focusModeAnchorId ? false : isLimited;

  // Track the data key to detect when underlying data changes
  const dataKey = useMemo(
    () =>
      filteredItems
        .map(i => i.id)
        .sort()
        .join(','),
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

  // Update node and edge selection/connection state without resetting positions
  // Use selectedConnectedItemIds for highlighting (changes with selection)
  // Note: setNodes/setEdges are stable from React Flow hooks, so not included in deps
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => {
        const isConnected = selectedConnectedItemIds ? selectedConnectedItemIds.has(node.id) : true;
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

    // Update edge opacity based on focus mode
    setEdges(currentEdges =>
      currentEdges.map(edge => {
        const sourceConnected = selectedConnectedItemIds
          ? selectedConnectedItemIds.has(edge.source)
          : true;
        const targetConnected = selectedConnectedItemIds
          ? selectedConnectedItemIds.has(edge.target)
          : true;
        const isEdgeDimmed = focusMode && selectedItemId && (!sourceConnected || !targetConnected);
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isEdgeDimmed ? 0.2 : 1,
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, selectedConnectedItemIds, focusMode]);

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
      {/* Item limit warning banner (hidden in focus mode) */}
      {showLimitBanner && (
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
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            hideOrphanItems={hideOrphanItems}
            onToggleOrphanItems={handleToggleOrphanItems}
            orphanCount={orphanCount}
            focusMode={focusMode}
            onToggleFocusMode={handleToggleFocusMode}
            hasSelection={!!selectedItemId}
          />

          {/* Instructions */}
          <Panel
            position="bottom-left"
            className="bg-white/90 px-3 py-2 rounded-lg text-xs text-gray-500"
          >
            Drag nodes to reorganize • Scroll to zoom • Click nodes to select
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrapper component that provides ReactFlowProvider
const CanvasView: React.FC<CanvasViewProps> = props => {
  return (
    <ReactFlowProvider>
      <CanvasViewInner {...props} />
    </ReactFlowProvider>
  );
};

export default CanvasView;
