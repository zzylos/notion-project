import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { typeHexColors } from '../../utils/colors';
import { calculateLayout } from '../../utils/layoutCalculator';
import CanvasNode from './CanvasNode';

const nodeTypes = {
  workItem: CanvasNode,
};

const CanvasViewInner: React.FC = () => {
  const { getFilteredItems, setSelectedItem, selectedItemId } = useStore();
  const filteredItems = getFilteredItems();
  const { fitView } = useReactFlow();

  // Track data changes
  const dataKey = useMemo(
    () => filteredItems.map(i => i.id).sort().join(','),
    [filteredItems]
  );

  const prevDataKeyRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Calculate layout
  const currentLayout = useMemo(
    () => calculateLayout(filteredItems, selectedItemId),
    [filteredItems, selectedItemId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(currentLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentLayout.edges);

  // Update when data changes
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
  }, [dataKey, filteredItems, selectedItemId, setNodes, setEdges]);

  // Update selection state
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedItemId,
        },
      }))
    );
  }, [selectedItemId, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedItem(node.id);
    },
    [setSelectedItem]
  );

  const nodeColor = useCallback((node: Node) => {
    const item = node.data?.item as WorkItem;
    return item ? typeHexColors[item.type] : '#94a3b8';
  }, []);

  const handleResetLayout = useCallback(() => {
    const newLayout = calculateLayout(filteredItems, selectedItemId);
    setNodes(newLayout.nodes);
    setEdges(newLayout.edges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [filteredItems, selectedItemId, fitView, setNodes, setEdges]);

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No items to display</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50">
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
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap nodeColor={nodeColor} zoomable pannable className="bg-white border border-gray-200 rounded-lg" />

        {/* Reset button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleResetLayout}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset Layout
          </button>
        </div>
      </ReactFlow>
    </div>
  );
};

const CanvasView: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CanvasViewInner />
    </ReactFlowProvider>
  );
};

CanvasView.displayName = 'CanvasView';

export default CanvasView;
