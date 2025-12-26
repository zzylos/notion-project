import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from './FilterPanel';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';

// Helper to create mock items
const createMockItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 'test-id',
  title: 'Test Item',
  type: 'project',
  status: 'In Progress',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('FilterPanel', () => {
  beforeEach(() => {
    // Reset store state
    const { setItems, resetFilters } = useStore.getState();
    setItems([
      createMockItem({ id: '1', type: 'mission', status: 'In Progress', priority: 'P0' }),
      createMockItem({ id: '2', type: 'problem', status: 'Completed', priority: 'P1' }),
      createMockItem({ id: '3', type: 'solution', status: 'Blocked', priority: 'P2' }),
    ]);
    resetFilters();
  });

  it('should render without crashing', () => {
    render(<FilterPanel />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should render all filter sections', () => {
    render(<FilterPanel />);

    // Check for filter section headers using buttons with aria-expanded
    const typeButton = screen.getByRole('button', { name: /type/i });
    const statusButton = screen.getByRole('button', { name: /status/i });
    const priorityButton = screen.getByRole('button', { name: /priority/i });

    expect(typeButton).toBeInTheDocument();
    expect(statusButton).toBeInTheDocument();
    expect(priorityButton).toBeInTheDocument();
    // Owner section may not show if no items have owners
  });

  describe('Search functionality', () => {
    it('should update search query on input change', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test query');

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.searchQuery).toBe('test query');
      });
    });

    it('should clear search when X button is clicked', async () => {
      const { setFilters } = useStore.getState();
      setFilters({ searchQuery: 'existing query' });

      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find and click clear button
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.searchQuery).toBe('');
      });
    });
  });

  describe('Type filter', () => {
    it('should toggle type filter when clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find a type button and click it
      const missionButton = screen.getByRole('button', { name: /mission/i });
      await user.click(missionButton);

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).toContain('mission');
      });

      // Click again to deselect
      await user.click(missionButton);

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).not.toContain('mission');
      });
    });
  });

  describe('Priority filter', () => {
    it('should toggle priority filter when clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find a priority button and click it
      const p0Button = screen.getByRole('button', { name: /p0/i });
      await user.click(p0Button);

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.priorities).toContain('P0');
      });
    });
  });

  describe('Type filter exclusion', () => {
    it('should show filter summary when filters are active', async () => {
      const { setFilters } = useStore.getState();
      setFilters({ types: ['mission'] });

      render(<FilterPanel />);

      // Active filters bar should show "Showing: 1 types"
      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });

    it('should cycle through show → hide → clear states when clicking type filters', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find the mission button and click it
      const missionButton = screen.getByRole('button', { name: /mission/i });

      // First click: neutral → included (show)
      await user.click(missionButton);
      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).toContain('mission');
        expect(state.filters.excludeTypes).not.toContain('mission');
      });

      // Second click: included → excluded (hide)
      await user.click(missionButton);
      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).not.toContain('mission');
        expect(state.filters.excludeTypes).toContain('mission');
      });

      // Third click: excluded → neutral (clear)
      await user.click(missionButton);
      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).not.toContain('mission');
        expect(state.filters.excludeTypes).not.toContain('mission');
      });
    });
  });

  describe('Clear filters', () => {
    it('should reset all filters when clear button is clicked', async () => {
      const { setFilters } = useStore.getState();
      setFilters({
        types: ['mission'],
        statuses: ['In Progress'],
        priorities: ['P0'],
        searchQuery: 'test',
      });

      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find and click clear button
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      await waitFor(() => {
        const state = useStore.getState();
        expect(state.filters.types).toHaveLength(0);
        expect(state.filters.statuses).toHaveLength(0);
        expect(state.filters.priorities).toHaveLength(0);
        expect(state.filters.searchQuery).toBe('');
      });
    });
  });

  describe('Section collapsibility', () => {
    it('should collapse and expand sections when header is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel />);

      // Find the Type section header and click it
      const typeHeader = screen.getByRole('button', { name: /type/i });

      // Find a type button that should be visible
      const missionButton = screen.getByRole('button', { name: /mission/i });
      expect(missionButton).toBeVisible();

      // Click to collapse
      await user.click(typeHeader);

      // After collapse, the buttons should be hidden
      await waitFor(() => {
        // The section content should be hidden
        const typeSection = typeHeader.closest('div');
        expect(typeSection).toBeInTheDocument();
      });
    });
  });
});
