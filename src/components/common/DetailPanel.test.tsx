import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DetailPanel from './DetailPanel';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">×</span>,
  ExternalLink: () => <span data-testid="icon-external">↗</span>,
  Clock: () => <span data-testid="icon-clock">🕐</span>,
  Tag: () => <span data-testid="icon-tag">🏷</span>,
  ArrowUp: () => <span data-testid="icon-arrow-up">↑</span>,
  ArrowDown: () => <span data-testid="icon-arrow-down">↓</span>,
  AlertTriangle: () => <span data-testid="icon-alert">⚠</span>,
  Target: () => <span data-testid="icon-target">🎯</span>,
  ChevronRight: () => <span data-testid="icon-chevron">&gt;</span>,
  Home: () => <span data-testid="icon-home">🏠</span>,
}));

// Mock utils
vi.mock('../../utils/colors', () => ({
  getStatusColors: () => ({
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  }),
  getStatusCategory: (status: string) => {
    if (status.toLowerCase().includes('done')) return 'completed';
    if (status.toLowerCase().includes('blocked')) return 'blocked';
    return 'in-progress';
  },
  typeColors: {
    mission: { bg: 'bg-purple-100', text: 'text-purple-700' },
    problem: { bg: 'bg-red-100', text: 'text-red-700' },
    solution: { bg: 'bg-green-100', text: 'text-green-700' },
    project: { bg: 'bg-blue-100', text: 'text-blue-700' },
    design: { bg: 'bg-orange-100', text: 'text-orange-700' },
  },
  priorityColors: {
    P0: { bg: 'bg-red-100', text: 'text-red-700' },
    P1: { bg: 'bg-orange-100', text: 'text-orange-700' },
    P2: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    P3: { bg: 'bg-gray-100', text: 'text-gray-700' },
  },
  typeLabels: {
    mission: 'Mission',
    problem: 'Problem',
    solution: 'Solution',
    project: 'Project',
    design: 'Design',
  },
  getProgressColor: (progress: number) =>
    progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-blue-500',
}));

vi.mock('../../utils/icons', () => ({
  typeIcons: {
    mission: () => <span>🎯</span>,
    problem: () => <span>❓</span>,
    solution: () => <span>💡</span>,
    project: () => <span>📦</span>,
    design: () => <span>🎨</span>,
  },
}));

vi.mock('../../utils/dateUtils', () => ({
  isOverdue: (dueDate: string, status: string) => {
    if (status === 'Done') return false;
    return new Date(dueDate) < new Date();
  },
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

vi.mock('../../utils/validation', () => ({
  isValidNotionUrl: (url: string) => url.includes('notion.so'),
}));

// Mock RelationshipList component
vi.mock('./RelationshipList', () => ({
  default: ({ title, items }: { title: string; items: WorkItem[] }) => (
    <div data-testid={`relationship-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <span>{title}</span>
      <span>({items.length} items)</span>
    </div>
  ),
}));

// Create test item helper
const createTestItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 'test-item-1',
  title: 'Test Work Item',
  type: 'project',
  status: 'In Progress',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('DetailPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      items: new Map(),
      selectedItemId: null,
      expandedIds: new Set(),
    });
  });

  it('shows empty state when no item is selected', () => {
    useStore.setState({ selectedItemId: null });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('Select an item')).toBeInTheDocument();
    expect(screen.getByText(/Click on any item in the tree/)).toBeInTheDocument();
  });

  it('renders item details when item is selected', () => {
    const item = createTestItem({
      title: 'Unique Test Project 123',
      status: 'In Progress',
      type: 'project',
    });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    // Use getAllByText for elements that may appear multiple times
    expect(screen.getAllByText('Unique Test Project 123').length).toBeGreaterThan(0);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('displays priority badge when item has priority', () => {
    const item = createTestItem({ priority: 'P0' });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('P0')).toBeInTheDocument();
  });

  it('displays progress bar when item has progress', () => {
    const item = createTestItem({ progress: 75 });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('75% complete')).toBeInTheDocument();
  });

  it('shows "almost done" warning when progress is high but not completed', () => {
    const item = createTestItem({ progress: 85, status: 'In Progress' });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText(/Almost done - needs to close!/)).toBeInTheDocument();
  });

  it('displays owner information when present', () => {
    const item = createTestItem({
      owner: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows "No owner assigned" when no owner', () => {
    const item = createTestItem({ owner: undefined });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('No owner assigned')).toBeInTheDocument();
  });

  it('displays due date when present', () => {
    const item = createTestItem({ dueDate: '2024-12-31' });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument();
  });

  it('displays tags when present', () => {
    const item = createTestItem({ tags: ['frontend', 'urgent', 'refactor'] });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('refactor')).toBeInTheDocument();
  });

  it('displays description when present', () => {
    const item = createTestItem({
      description: 'This is a detailed description of the work item.',
    });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(
      screen.getByText('This is a detailed description of the work item.')
    ).toBeInTheDocument();
  });

  it('shows Notion link button for valid Notion URLs', () => {
    const item = createTestItem({
      notionUrl: 'https://notion.so/workspace/page-123',
    });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    const link = screen.getByRole('link', { name: /Open in Notion/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://notion.so/workspace/page-123');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('hides Notion link for invalid URLs', () => {
    const item = createTestItem({
      notionUrl: 'https://example.com/not-notion',
    });

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.queryByText('Open in Notion')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const item = createTestItem();

    useStore.setState({
      items: new Map([[item.id, item]]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('icon-x').parentElement!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays breadcrumb path to item', () => {
    const grandparent = createTestItem({
      id: 'gp',
      title: 'Grandparent Title XYZ',
      type: 'mission',
    });
    const parent = createTestItem({
      id: 'parent',
      title: 'Parent Title ABC',
      type: 'problem',
      parentId: 'gp',
    });
    const item = createTestItem({
      id: 'item',
      title: 'Item Title 123',
      type: 'solution',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [grandparent.id, grandparent],
        [parent.id, parent],
        [item.id, item],
      ]),
      selectedItemId: item.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    // Use getAllByText to handle multiple occurrences (e.g., in path and title)
    expect(screen.getAllByText('Grandparent Title XYZ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parent Title ABC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Item Title 123').length).toBeGreaterThan(0);
  });

  it('displays parent relationship', () => {
    const parent = createTestItem({
      id: 'parent',
      title: 'The Parent',
    });
    const child = createTestItem({
      id: 'child',
      title: 'The Child',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      selectedItemId: child.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByTestId('relationship-parent')).toBeInTheDocument();
  });

  it('displays children relationship', () => {
    const parent = createTestItem({
      id: 'parent',
      title: 'The Parent',
      children: ['child1', 'child2'],
    });
    const child1 = createTestItem({
      id: 'child1',
      title: 'First Child',
      parentId: 'parent',
    });
    const child2 = createTestItem({
      id: 'child2',
      title: 'Second Child',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child1.id, child1],
        [child2.id, child2],
      ]),
      selectedItemId: parent.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    const childrenRelation = screen.getByTestId('relationship-children');
    expect(childrenRelation).toBeInTheDocument();
    expect(childrenRelation).toHaveTextContent('(2 items)');
  });

  it('displays blocked-by relationships', () => {
    const blocker = createTestItem({
      id: 'blocker',
      title: 'Blocker Item',
    });
    const blockedItem = createTestItem({
      id: 'blocked',
      title: 'Blocked Item',
      blockedBy: ['blocker'],
    });

    useStore.setState({
      items: new Map([
        [blocker.id, blocker],
        [blockedItem.id, blockedItem],
      ]),
      selectedItemId: blockedItem.id,
    });

    render(<DetailPanel onClose={mockOnClose} />);

    expect(screen.getByTestId('relationship-blocked-by')).toBeInTheDocument();
  });

  it('navigates to item when path item is clicked', () => {
    const parent = createTestItem({
      id: 'parent',
      title: 'Parent Item',
    });
    const child = createTestItem({
      id: 'child',
      title: 'Child Item',
      parentId: 'parent',
    });

    useStore.setState({
      items: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      selectedItemId: child.id,
      expandedIds: new Set(),
    });

    render(<DetailPanel onClose={mockOnClose} />);

    // Click on parent in the path (use getAllByText since "Parent" appears as section label too)
    const pathItems = screen.getAllByText('Parent Item');
    fireEvent.click(pathItems[0]);

    // Check that expandToItem was called (adds parent to expandedIds and sets focusedItemId)
    const state = useStore.getState();
    expect(state.focusedItemId).toBe('parent');
    expect(state.expandedIds.has('parent')).toBe(true);
  });

  it('returns null when selected item does not exist in store', () => {
    useStore.setState({
      items: new Map(),
      selectedItemId: 'non-existent',
    });

    const { container } = render(<DetailPanel onClose={mockOnClose} />);

    // Should render nothing (null)
    expect(container.firstChild).toBeNull();
  });
});
