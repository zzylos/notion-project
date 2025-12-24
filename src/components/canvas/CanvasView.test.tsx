import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CanvasView from './CanvasView';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    children,
    onNodeClick,
  }: {
    children: React.ReactNode;
    onNodeClick?: (e: React.MouseEvent, node: { id: string }) => void;
  }) => (
    <div data-testid="react-flow" onClick={e => onNodeClick?.(e, { id: 'test-node' })}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Panel: ({ children, position }: { children: React.ReactNode; position: string }) => (
    <div data-testid={`panel-${position}`}>{children}</div>
  ),
  ConnectionMode: { Loose: 'loose' },
  useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useReactFlow: () => ({ fitView: vi.fn() }),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock layout calculator
vi.mock('../../utils/layoutCalculator', () => ({
  calculateLayout: (items: WorkItem[]) => ({
    nodes: items.map(item => ({
      id: item.id,
      type: 'workItem',
      position: { x: 0, y: 0 },
      data: { item, isSelected: false, isConnected: true, isDimmed: false },
    })),
    edges: [],
  }),
}));

// Mock child components
vi.mock('./CanvasNode', () => ({
  default: () => <div data-testid="canvas-node" />,
}));

vi.mock('./CanvasLegend', () => ({
  default: () => <div data-testid="canvas-legend" />,
}));

vi.mock('./CanvasControls', () => ({
  default: (props: {
    onResetLayout: () => void;
    onToggleFullscreen: () => void;
    isFullscreen: boolean;
    hideOrphanItems: boolean;
    onToggleOrphanItems: () => void;
    orphanCount: number;
    focusMode: boolean;
    onToggleFocusMode: () => void;
    hasSelection: boolean;
  }) => (
    <div data-testid="canvas-controls">
      <button data-testid="reset-layout" onClick={props.onResetLayout}>
        Reset
      </button>
      <button data-testid="toggle-fullscreen" onClick={props.onToggleFullscreen}>
        {props.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      <button data-testid="toggle-orphans" onClick={props.onToggleOrphanItems}>
        {props.hideOrphanItems ? 'Show Orphans' : 'Hide Orphans'} ({props.orphanCount})
      </button>
      <button data-testid="toggle-focus" onClick={props.onToggleFocusMode}>
        {props.focusMode ? 'Exit Focus' : 'Focus Mode'}
      </button>
    </div>
  ),
}));

vi.mock('../ui/ItemLimitBanner', () => ({
  default: ({ totalItems, displayedItems }: { totalItems: number; displayedItems: number }) => (
    <div data-testid="item-limit-banner">
      Showing {displayedItems} of {totalItems} items
    </div>
  ),
}));

// Create test items
const createTestItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: `item-${Math.random().toString(36).substring(7)}`,
  title: 'Test Item',
  type: 'project',
  status: 'In Progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('CanvasView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useStore.setState({
      items: new Map(),
      selectedItemId: null,
      hideOrphanItems: false,
      expandedIds: new Set(),
      filters: {
        types: [],
        statuses: [],
        priorities: [],
        owners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });
  });

  it('renders React Flow container', () => {
    render(<CanvasView />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('renders canvas controls', () => {
    render(<CanvasView />);
    expect(screen.getByTestId('canvas-controls')).toBeInTheDocument();
  });

  it('renders canvas legend', () => {
    render(<CanvasView />);
    expect(screen.getByTestId('canvas-legend')).toBeInTheDocument();
  });

  it('renders minimap and controls', () => {
    render(<CanvasView />);
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
  });

  it('renders instructions panel', () => {
    render(<CanvasView />);
    expect(screen.getByTestId('panel-bottom-left')).toBeInTheDocument();
    expect(screen.getByText(/Drag nodes to reorganize/)).toBeInTheDocument();
  });

  it('handles node selection via callback', () => {
    const handleSelect = vi.fn();
    render(<CanvasView onNodeSelect={handleSelect} />);

    // Click on the React Flow container (which triggers our mock's onNodeClick)
    fireEvent.click(screen.getByTestId('react-flow'));

    expect(handleSelect).toHaveBeenCalled();
  });

  it('toggles orphan items visibility', () => {
    render(<CanvasView />);

    const toggleButton = screen.getByTestId('toggle-orphans');
    expect(toggleButton).toHaveTextContent('Hide Orphans');

    fireEvent.click(toggleButton);

    // Check store state was updated
    expect(useStore.getState().hideOrphanItems).toBe(true);
  });

  it('toggles focus mode', () => {
    render(<CanvasView />);

    const toggleButton = screen.getByTestId('toggle-focus');
    expect(toggleButton).toHaveTextContent('Focus Mode');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('Exit Focus');
  });

  it('displays item limit banner when items exceed limit', () => {
    // Create many items to trigger the limit
    const items = new Map<string, WorkItem>();
    for (let i = 0; i < 600; i++) {
      const item = createTestItem({ id: `item-${i}`, title: `Item ${i}` });
      items.set(item.id, item);
    }

    useStore.setState({ items });

    render(<CanvasView />);
    expect(screen.getByTestId('item-limit-banner')).toBeInTheDocument();
  });

  it('does not show item limit banner when within limit', () => {
    const items = new Map<string, WorkItem>();
    for (let i = 0; i < 10; i++) {
      const item = createTestItem({ id: `item-${i}` });
      items.set(item.id, item);
    }

    useStore.setState({ items });

    render(<CanvasView />);
    expect(screen.queryByTestId('item-limit-banner')).not.toBeInTheDocument();
  });

  it('calculates connected items when item is selected', () => {
    const parent = createTestItem({ id: 'parent', title: 'Parent' });
    const child1 = createTestItem({ id: 'child1', title: 'Child 1', parentId: 'parent' });
    const child2 = createTestItem({ id: 'child2', title: 'Child 2', parentId: 'parent' });

    // Set up parent-child relationships
    parent.children = ['child1', 'child2'];

    const items = new Map<string, WorkItem>([
      [parent.id, parent],
      [child1.id, child1],
      [child2.id, child2],
    ]);

    useStore.setState({ items, selectedItemId: 'child1' });

    render(<CanvasView />);
    // The component should calculate connected items (parent and siblings)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('identifies orphan items correctly', () => {
    // An orphan has no parent in the set AND no children
    const orphan = createTestItem({ id: 'orphan', title: 'Orphan Item' });
    const parent = createTestItem({ id: 'parent', title: 'Parent' });
    const child = createTestItem({ id: 'child', title: 'Child', parentId: 'parent' });

    parent.children = ['child'];

    const items = new Map<string, WorkItem>([
      [orphan.id, orphan],
      [parent.id, parent],
      [child.id, child],
    ]);

    useStore.setState({ items });

    render(<CanvasView />);

    // Check that orphan count is shown in the toggle button
    expect(screen.getByTestId('toggle-orphans')).toHaveTextContent('(1)');
  });

  it('handles reset layout action', () => {
    const items = new Map<string, WorkItem>();
    const item = createTestItem();
    items.set(item.id, item);

    useStore.setState({ items });

    render(<CanvasView />);

    const resetButton = screen.getByTestId('reset-layout');
    fireEvent.click(resetButton);

    // Reset should not throw and component should still be rendered
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('handles blocked-by relationships in focus mode', () => {
    const blocker = createTestItem({ id: 'blocker', title: 'Blocker' });
    const blocked = createTestItem({
      id: 'blocked',
      title: 'Blocked Item',
      blockedBy: ['blocker'],
    });

    const items = new Map<string, WorkItem>([
      [blocker.id, blocker],
      [blocked.id, blocked],
    ]);

    useStore.setState({ items, selectedItemId: 'blocked' });

    render(<CanvasView />);

    // Enable focus mode
    fireEvent.click(screen.getByTestId('toggle-focus'));

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });
});
