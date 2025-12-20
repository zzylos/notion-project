import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  MarkerType,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { typeHexColors } from '../../utils/colors';
import CanvasNode from './CanvasNode';

// Custom node types
const nodeTypes = {
  workItem: CanvasNode,
};

// Layout configuration
const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 150;
const NODE_WIDTH = 250;

interface CanvasViewProps {
  onNodeSelect?: (id: string) => void;
}

const CanvasView: React.FC<CanvasViewProps> = ({ onNodeSelect }) => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const filteredItems = getFilteredItems();

  // Convert work items to React Flow nodes with hierarchical layout
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];

    // Find root items (no parent or parent not in filtered set)
    const filteredIds = new Set(filteredItems.map(i => i.id));
    const rootItems = filteredItems.filter(
      item => !item.parentId || !filteredIds.has(item.parentId)
    );

    // Calculate positions using a tree layout algorithm
    const positionMap = new Map<string, { x: number; y: number }>();
    let currentX = 0;

    const calculatePositions = (
      item: WorkItem,
      level: number,
      parentX?: number
    ): number => {
      const children = filteredItems.filter(i => i.parentId === item.id);

      if (children.length === 0) {
        // Leaf node
        const x = parentX !== undefined ? parentX : currentX;
        positionMap.set(item.id, { x, y: level * VERTICAL_SPACING });
        currentX = Math.max(currentX, x + HORIZONTAL_SPACING);
        return x;
      }

      // Calculate children positions first
      let childXSum = 0;
      let childCount = 0;

      for (const child of children) {
        const childX = calculatePositions(child, level + 1, undefined);
        childXSum += childX;
        childCount++;
      }

      // Parent is centered above children
      const avgChildX = childXSum / childCount;
      positionMap.set(item.id, { x: avgChildX, y: level * VERTICAL_SPACING });

      return avgChildX;
    };

    // Position each root tree
    for (const root of rootItems) {
      calculatePositions(root, 0);
      currentX += HORIZONTAL_SPACING / 2; // Gap between trees
    }

    // Create nodes
    for (const item of filteredItems) {
      const position = positionMap.get(item.id) || { x: 0, y: 0 };

      nodeList.push({
        id: item.id,
        type: 'workItem',
        position,
        data: {
          item,
          isSelected: item.id === selectedItemId,
        },
        style: {
          width: NODE_WIDTH,
        },
      });

      // Create edges for parent-child relationships
      if (item.parentId && filteredIds.has(item.parentId)) {
        edgeList.push({
          id: `${item.parentId}-${item.id}`,
          source: item.parentId,
          target: item.id,
          type: 'smoothstep',
          animated: item.status === 'in-progress',
          style: {
            stroke: typeHexColors[item.type],
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: typeHexColors[item.type],
          },
        });
      }

      // Create edges for blocked-by relationships
      if (item.blockedBy) {
        for (const blockerId of item.blockedBy) {
          if (filteredIds.has(blockerId)) {
            edgeList.push({
              id: `blocked-${blockerId}-${item.id}`,
              source: blockerId,
              target: item.id,
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: '#ef4444',
                strokeWidth: 2,
                strokeDasharray: '5,5',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#ef4444',
              },
              label: 'blocks',
              labelStyle: { fill: '#ef4444', fontSize: 10 },
            });
          }
        }
      }
    }

    return { nodes: nodeList, edges: edgeList };
  }, [filteredItems, selectedItemId]);

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
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        <Panel position="top-left" className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.mission }} />
              <span className="text-xs text-gray-600">Mission</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.problem }} />
              <span className="text-xs text-gray-600">Problem</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.solution }} />
              <span className="text-xs text-gray-600">Solution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.design }} />
              <span className="text-xs text-gray-600">Design</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeHexColors.project }} />
              <span className="text-xs text-gray-600">Project</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-gray-400" />
              <span className="text-xs text-gray-600">Parent → Child</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-400" style={{ borderStyle: 'dashed' }} />
              <span className="text-xs text-gray-600">Blocked by</span>
            </div>
          </div>
        </Panel>

        {/* Instructions */}
        <Panel position="bottom-left" className="bg-white/90 px-3 py-2 rounded-lg text-xs text-gray-500">
          Drag to pan • Scroll to zoom • Click nodes to select
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default CanvasView;
