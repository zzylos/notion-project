import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterToggle } from './useFilterToggle';
import { useStore } from '../store/useStore';

describe('useFilterToggle', () => {
  beforeEach(() => {
    // Reset the store before each test
    const state = useStore.getState();
    state.resetFilters();
  });

  describe('toggleType', () => {
    it('should add type to filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleType('project');
      });

      const filters = useStore.getState().filters;
      expect(filters.types).toContain('project');
    });

    it('should remove type from filter when already present', () => {
      // First add the type
      useStore.getState().setFilters({ types: ['project'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleType('project');
      });

      const filters = useStore.getState().filters;
      expect(filters.types).not.toContain('project');
    });

    it('should handle multiple types', () => {
      const { result } = renderHook(() => useFilterToggle());

      // Each toggle needs its own act() because the hook depends on current filter state
      act(() => {
        result.current.toggleType('project');
      });

      act(() => {
        result.current.toggleType('mission');
      });

      const filters = useStore.getState().filters;
      expect(filters.types).toContain('project');
      expect(filters.types).toContain('mission');
    });
  });

  describe('toggleExcludeType', () => {
    it('should add type to exclude filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeType('design');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeTypes).toContain('design');
    });

    it('should remove type from exclude filter when already present', () => {
      useStore.getState().setFilters({ excludeTypes: ['design'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeType('design');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeTypes).not.toContain('design');
    });
  });

  describe('toggleStatus', () => {
    it('should add status to filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleStatus('In Progress');
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).toContain('In Progress');
    });

    it('should remove status from filter when already present', () => {
      useStore.getState().setFilters({ statuses: ['In Progress'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleStatus('In Progress');
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).not.toContain('In Progress');
    });
  });

  describe('toggleExcludeStatus', () => {
    it('should add status to exclude filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeStatus('Done');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeStatuses).toContain('Done');
    });

    it('should remove status from exclude filter when already present', () => {
      useStore.getState().setFilters({ excludeStatuses: ['Done'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeStatus('Done');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeStatuses).not.toContain('Done');
    });
  });

  describe('togglePriority', () => {
    it('should add priority to filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.togglePriority('P1');
      });

      const filters = useStore.getState().filters;
      expect(filters.priorities).toContain('P1');
    });

    it('should remove priority from filter when already present', () => {
      useStore.getState().setFilters({ priorities: ['P1'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.togglePriority('P1');
      });

      const filters = useStore.getState().filters;
      expect(filters.priorities).not.toContain('P1');
    });
  });

  describe('toggleExcludePriority', () => {
    it('should add priority to exclude filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludePriority('P3');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludePriorities).toContain('P3');
    });

    it('should remove priority from exclude filter when already present', () => {
      useStore.getState().setFilters({ excludePriorities: ['P3'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludePriority('P3');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludePriorities).not.toContain('P3');
    });
  });

  describe('toggleOwner', () => {
    it('should add owner ID to filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleOwner('user-123');
      });

      const filters = useStore.getState().filters;
      expect(filters.owners).toContain('user-123');
    });

    it('should remove owner ID from filter when already present', () => {
      useStore.getState().setFilters({ owners: ['user-123'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleOwner('user-123');
      });

      const filters = useStore.getState().filters;
      expect(filters.owners).not.toContain('user-123');
    });
  });

  describe('toggleExcludeOwner', () => {
    it('should add owner ID to exclude filter when not present', () => {
      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeOwner('user-456');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeOwners).toContain('user-456');
    });

    it('should remove owner ID from exclude filter when already present', () => {
      useStore.getState().setFilters({ excludeOwners: ['user-456'] });

      const { result } = renderHook(() => useFilterToggle());

      act(() => {
        result.current.toggleExcludeOwner('user-456');
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeOwners).not.toContain('user-456');
    });
  });

  describe('toggleStatusGroup', () => {
    it('should add all statuses in group when none are selected', () => {
      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['In Progress', 'Active', 'Doing'];
      act(() => {
        result.current.toggleStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).toContain('In Progress');
      expect(filters.statuses).toContain('Active');
      expect(filters.statuses).toContain('Doing');
    });

    it('should add all statuses when only some are selected', () => {
      useStore.getState().setFilters({ statuses: ['In Progress'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['In Progress', 'Active', 'Doing'];
      act(() => {
        result.current.toggleStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).toContain('In Progress');
      expect(filters.statuses).toContain('Active');
      expect(filters.statuses).toContain('Doing');
    });

    it('should remove all statuses when all are selected', () => {
      useStore.getState().setFilters({ statuses: ['In Progress', 'Active', 'Doing'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['In Progress', 'Active', 'Doing'];
      act(() => {
        result.current.toggleStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).not.toContain('In Progress');
      expect(filters.statuses).not.toContain('Active');
      expect(filters.statuses).not.toContain('Doing');
    });

    it('should preserve other statuses not in the group', () => {
      useStore.getState().setFilters({ statuses: ['Done', 'In Progress', 'Active', 'Doing'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['In Progress', 'Active', 'Doing'];
      act(() => {
        result.current.toggleStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.statuses).toContain('Done');
      expect(filters.statuses).not.toContain('In Progress');
    });

    it('should not add duplicates', () => {
      useStore.getState().setFilters({ statuses: ['In Progress'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['In Progress', 'Active'];
      act(() => {
        result.current.toggleStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      const inProgressCount = filters.statuses.filter(s => s === 'In Progress').length;
      expect(inProgressCount).toBe(1);
    });
  });

  describe('toggleExcludeStatusGroup', () => {
    it('should add all statuses to exclude when none are excluded', () => {
      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['Done', 'Completed', 'Closed'];
      act(() => {
        result.current.toggleExcludeStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeStatuses).toContain('Done');
      expect(filters.excludeStatuses).toContain('Completed');
      expect(filters.excludeStatuses).toContain('Closed');
    });

    it('should remove all statuses from exclude when all are excluded', () => {
      useStore.getState().setFilters({ excludeStatuses: ['Done', 'Completed', 'Closed'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['Done', 'Completed', 'Closed'];
      act(() => {
        result.current.toggleExcludeStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeStatuses).not.toContain('Done');
      expect(filters.excludeStatuses).not.toContain('Completed');
      expect(filters.excludeStatuses).not.toContain('Closed');
    });

    it('should preserve other excluded statuses not in the group', () => {
      useStore
        .getState()
        .setFilters({ excludeStatuses: ['Blocked', 'Done', 'Completed', 'Closed'] });

      const { result } = renderHook(() => useFilterToggle());

      const groupStatuses = ['Done', 'Completed', 'Closed'];
      act(() => {
        result.current.toggleExcludeStatusGroup(groupStatuses);
      });

      const filters = useStore.getState().filters;
      expect(filters.excludeStatuses).toContain('Blocked');
    });
  });
});
