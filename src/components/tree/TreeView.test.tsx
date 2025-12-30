import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TreeView from './TreeView';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';

// Mock child components
vi.mock('./TreeNode', () => ({
  default: ({
    node,
    onNodeClick,
  }: {
    node: { item: WorkItem; children: { item: WorkItem }[] };
    onNodeClick: (id: string) => void;
  }) => (
    <div data-testid={`tree-node-${node.item.id}`} onClick={() => onNodeClick(node.item.id)}>
      <span>{node.item.title}</span>
      {node.children.length > 0 && (
        <div data-testid={`children-of-${node.item.id}`}>
          {node.children.map((child: { item: WorkItem }) => (
            <div key={child.item.id} data-testid={`tree-node-${child.item.id}`}>
              {child.item.title}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock('../ui/EmptyState', () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../ui/LoadingState', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading-state">{message}</div>,
}));

vi.mock('../ui/ItemLimitBanner', () => ({
  default: ({ totalItems, displayedItems }: { totalItems: number; displayedItems: number }) => (
    <div data-testid="item-limit-banner">
      Showing {displayedItems} of {totalItems} items
    </div>
  ),
}));

// Create test item helper
const createTestItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: `item-${Math.random().toString(36).substring(7)}`,
  title: 'Test Item',
  type: 'project',
  status: 'In Progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('TreeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      items: new Map(),
      selectedItemId: null,
      expandedIds: new Set(),
      isLoading: false,
      disableItemLimit: false,
      // Disable orphan filtering so standalone test items are visible
      hideOrphanItems: false,
      showOnlyOrphans: false,
      filters: {
        types: [],
        excludeTypes: [],
        statuses: [],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });
  });

  it('shows loading state when isLoading is true', () => {
    useStore.setState({ isLoading: true });

    render(<TreeView />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading opportunity tree...')).toBeInTheDocument();
  });

  it('shows empty state when no items match filters', () => {
    useStore.setState({
      items: new Map(),
      isLoading: false,
    });

    render(<TreeView />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders tree nodes for items', () => {
    const item1 = createTestItem({ id: 'item-1', title: 'Item 1' });
    const item2 = createTestItem({ id: 'item-2', title: 'Item 2' });

    useStore.setState({
      items: new Map([
        [item1.id, item1],
        [item2.id, item2],
      ]),
    });

    render(<TreeView />);

    expect(screen.getByTestId('tree-node-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('tree-node-item-2')).toBeInTheDocument();
  });

  it('displays item count in header', () => {
    const items = new Map<string, WorkItem>();
    for (let i = 0; i < 5; i++) {
      const item = createTestItem({ id: `item-${i}`, title: `Item ${i}` });
      items.set(item.id, item);
    }

    useStore.setState({ items });

    render(<TreeView />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('items in tree')).toBeInTheDocument();
  });

  it('handles expand all button click', () => {
    const parent = createTestItem({ id: 'parent', title: 'Parent', children: ['child'] });
    const child = createTestItem({ id: 'child', title: 'Child', parentId: 'parent' });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      expandedIds: new Set(),
    });

    render(<TreeView />);

    // Click Expand button
    fireEvent.click(screen.getByText('Expand'));

    // Check that expandAll was called (all items should be expanded)
    expect(useStore.getState().expandedIds.has('parent')).toBe(true);
  });

  it('handles collapse all button click when expanded', () => {
    const parent = createTestItem({ id: 'parent', title: 'Parent', children: ['child'] });
    const child = createTestItem({ id: 'child', title: 'Child', parentId: 'parent' });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      expandedIds: new Set(['parent']),
    });

    render(<TreeView />);

    // Button should show "Collapse" when all are expanded
    fireEvent.click(screen.getByText('Collapse'));

    // Check that collapseAll was called
    expect(useStore.getState().expandedIds.size).toBe(0);
  });

  it('calls onNodeSelect when a node is clicked', () => {
    const mockOnNodeSelect = vi.fn();
    const item = createTestItem({ id: 'item-1', title: 'Item 1' });

    useStore.setState({
      items: new Map([[item.id, item]]),
    });

    render(<TreeView onNodeSelect={mockOnNodeSelect} />);

    fireEvent.click(screen.getByTestId('tree-node-item-1'));

    expect(mockOnNodeSelect).toHaveBeenCalledWith('item-1');
  });

  it('shows item limit banner when items exceed limit', () => {
    const items = new Map<string, WorkItem>();
    for (let i = 0; i < 600; i++) {
      const item = createTestItem({ id: `item-${i}`, title: `Item ${i}` });
      items.set(item.id, item);
    }

    useStore.setState({ items, disableItemLimit: false });

    render(<TreeView />);

    expect(screen.getByTestId('item-limit-banner')).toBeInTheDocument();
  });

  it('does not limit items when disableItemLimit is true', () => {
    const items = new Map<string, WorkItem>();
    for (let i = 0; i < 600; i++) {
      const item = createTestItem({ id: `item-${i}`, title: `Item ${i}` });
      items.set(item.id, item);
    }

    useStore.setState({ items, disableItemLimit: true });

    render(<TreeView />);

    expect(screen.queryByTestId('item-limit-banner')).not.toBeInTheDocument();
  });

  it('builds correct tree hierarchy', () => {
    const parent = createTestItem({
      id: 'parent',
      title: 'Parent',
      children: ['child1', 'child2'],
    });
    const child1 = createTestItem({
      id: 'child1',
      title: 'Child 1',
      parentId: 'parent',
    });
    const child2 = createTestItem({
      id: 'child2',
      title: 'Child 2',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child1.id, child1],
        [child2.id, child2],
      ]),
    });

    render(<TreeView />);

    // Parent should be rendered
    expect(screen.getByTestId('tree-node-parent')).toBeInTheDocument();
    // Parent should have children container
    expect(screen.getByTestId('children-of-parent')).toBeInTheDocument();
  });

  it('filters items correctly based on search query', () => {
    const item1 = createTestItem({ id: 'item-1', title: 'Apple Project' });
    const item2 = createTestItem({ id: 'item-2', title: 'Banana Project' });

    useStore.setState({
      items: new Map([
        [item1.id, item1],
        [item2.id, item2],
      ]),
      filters: {
        types: [],
        excludeTypes: [],
        statuses: [],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: 'Apple',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });

    render(<TreeView />);

    expect(screen.getByTestId('tree-node-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-item-2')).not.toBeInTheDocument();
  });

  it('filters items by type', () => {
    const mission = createTestItem({ id: 'mission-1', title: 'Mission', type: 'mission' });
    const project = createTestItem({ id: 'project-1', title: 'Project', type: 'project' });

    useStore.setState({
      items: new Map([
        [mission.id, mission],
        [project.id, project],
      ]),
      filters: {
        types: ['mission'],
        excludeTypes: [],
        statuses: [],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });

    render(<TreeView />);

    expect(screen.getByTestId('tree-node-mission-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-project-1')).not.toBeInTheDocument();
  });

  it('filters items by status', () => {
    const inProgress = createTestItem({
      id: 'item-1',
      title: 'In Progress Item',
      status: 'In Progress',
    });
    const done = createTestItem({
      id: 'item-2',
      title: 'Done Item',
      status: 'Done',
    });

    useStore.setState({
      items: new Map([
        [inProgress.id, inProgress],
        [done.id, done],
      ]),
      filters: {
        types: [],
        excludeTypes: [],
        statuses: ['Done'],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });

    render(<TreeView />);

    expect(screen.getByTestId('tree-node-item-2')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-item-1')).not.toBeInTheDocument();
  });

  it('supports hide mode for filters', () => {
    const inProgress = createTestItem({
      id: 'item-1',
      title: 'In Progress Item',
      status: 'In Progress',
    });
    const done = createTestItem({
      id: 'item-2',
      title: 'Done Item',
      status: 'Done',
    });

    useStore.setState({
      items: new Map([
        [inProgress.id, inProgress],
        [done.id, done],
      ]),
      filters: {
        types: [],
        excludeTypes: [],
        statuses: ['Done'],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'hide',
      },
    });

    render(<TreeView />);

    // In hide mode, items matching the filter should be hidden
    expect(screen.getByTestId('tree-node-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-item-2')).not.toBeInTheDocument();
  });

  it('renders orphaned items as roots when parent is filtered out', () => {
    const parent = createTestItem({
      id: 'parent',
      title: 'Parent',
      type: 'mission',
      children: ['child'],
    });
    const child = createTestItem({
      id: 'child',
      title: 'Child',
      type: 'project',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      filters: {
        types: ['project'], // Only show projects, hiding the mission parent
        excludeTypes: [],
        statuses: [],
        excludeStatuses: [],
        priorities: [],
        excludePriorities: [],
        owners: [],
        excludeOwners: [],
        searchQuery: '',
        showOnlyMyItems: false,
        filterMode: 'show',
      },
    });

    render(<TreeView />);

    // Child should be visible as a root node since parent is filtered out
    expect(screen.getByTestId('tree-node-child')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-parent')).not.toBeInTheDocument();
  });

  it('shows correct expand/collapse button state', () => {
    const parent = createTestItem({ id: 'parent', title: 'Parent', children: ['child'] });
    const child = createTestItem({ id: 'child', title: 'Child', parentId: 'parent' });

    // Initially not expanded
    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      expandedIds: new Set(),
    });

    const { rerender } = render(<TreeView />);
    expect(screen.getByText('Expand')).toBeInTheDocument();

    // Expand all - wrap in act() to properly handle state updates
    act(() => {
      useStore.setState({ expandedIds: new Set(['parent']) });
    });
    rerender(<TreeView />);
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });
});
