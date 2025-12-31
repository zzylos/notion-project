import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkItem,
  TreeNode,
  FilterState,
  ViewMode,
  NotionConfig,
  ItemType,
  Priority,
  DashboardStats,
} from '../types';
import { getStatusCategory } from '../utils/colors';
import { buildTreeNodes, getItemPath as getItemPathUtil } from '../utils/treeBuilder';
import {
  itemMatchesIncludeFilters,
  itemMatchesExcludeFilters,
  collectAncestorIds,
  isOrphanItem,
  itemMatchesSearch,
  applyOrphanFilter,
  hasActiveIncludeFilters,
  hasActiveExcludeFilters,
} from '../utils/filterUtils';
import { logger } from '../utils/logger';

interface StoreState {
  // Data
  items: Map<string, WorkItem>;

  // UI State
  selectedItemId: string | null;
  focusedItemId: string | null;
  expandedIds: Set<string>;
  viewMode: ViewMode;
  hideOrphanItems: boolean;
  showOnlyOrphans: boolean;
  disableItemLimit: boolean;

  // Filters
  filters: FilterState;

  // Loading/Error states
  isLoading: boolean;
  error: string | null;

  // Notion configuration
  notionConfig: NotionConfig | null;

  // Actions
  setItems: (items: WorkItem[]) => void;
  addItem: (item: WorkItem) => void;
  updateItem: (id: string, updates: Partial<WorkItem>) => void;
  removeItem: (id: string) => void;

  setSelectedItem: (id: string | null) => void;
  setFocusedItem: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToItem: (id: string) => void;

  setViewMode: (mode: ViewMode) => void;
  setHideOrphanItems: (hide: boolean) => void;
  setShowOnlyOrphans: (show: boolean) => void;
  toggleOrphanMode: () => void;
  setDisableItemLimit: (disable: boolean) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setNotionConfig: (config: NotionConfig | null) => void;

  // Computed values (not really computed in Zustand, but helper methods)
  getTreeNodes: () => TreeNode[];
  getFilteredItems: () => WorkItem[];
  getOrphanCount: () => number;
  getStats: () => DashboardStats;
  getItemPath: (id: string) => WorkItem[];
}

const defaultFilters: FilterState = {
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
  filterMode: 'show', // Kept for backwards compatibility, prefer using exclude arrays
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: new Map(),
      selectedItemId: null,
      focusedItemId: null,
      expandedIds: new Set(),
      viewMode: 'tree',
      hideOrphanItems: true,
      showOnlyOrphans: false,
      disableItemLimit: false,
      filters: defaultFilters,
      isLoading: false,
      error: null,
      notionConfig: null,

      // Item actions
      setItems: (items: WorkItem[]) => {
        const itemMap = new Map(items.map(item => [item.id, item]));
        set({ items: itemMap });
      },

      addItem: (item: WorkItem) => {
        set(state => {
          const newItems = new Map(state.items);
          newItems.set(item.id, item);
          return { items: newItems };
        });
      },

      updateItem: (id: string, updates: Partial<WorkItem>) => {
        set(state => {
          const newItems = new Map(state.items);
          const existing = newItems.get(id);
          if (existing) {
            newItems.set(id, { ...existing, ...updates });
          }
          return { items: newItems };
        });
      },

      removeItem: (id: string) => {
        set(state => {
          const newItems = new Map(state.items);
          newItems.delete(id);
          return { items: newItems };
        });
      },

      // Selection actions
      setSelectedItem: (id: string | null) => set({ selectedItemId: id }),
      setFocusedItem: (id: string | null) => set({ focusedItemId: id }),

      toggleExpanded: (id: string) => {
        set(state => {
          const newExpanded = new Set(state.expandedIds);
          if (newExpanded.has(id)) {
            newExpanded.delete(id);
          } else {
            newExpanded.add(id);
          }
          return { expandedIds: newExpanded };
        });
      },

      expandAll: () => {
        set(state => {
          const allIds = new Set(Array.from(state.items.keys()));
          return { expandedIds: allIds };
        });
      },

      collapseAll: () => set({ expandedIds: new Set() }),

      expandToItem: (id: string) => {
        const state = get();
        const path = state.getItemPath(id);
        const newExpanded = new Set(state.expandedIds);
        path.forEach(item => newExpanded.add(item.id));
        set({ expandedIds: newExpanded, focusedItemId: id });
      },

      // View mode
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

      // Orphan filter (global)
      setHideOrphanItems: (hide: boolean) => set({ hideOrphanItems: hide }),
      setShowOnlyOrphans: (show: boolean) => set({ showOnlyOrphans: show }),
      toggleOrphanMode: () =>
        set(state => ({
          showOnlyOrphans: !state.showOnlyOrphans,
          // When showing only orphans, we need to unhide them first
          hideOrphanItems: state.showOnlyOrphans ? true : false,
        })),

      // Item limit toggle (for performance with large datasets)
      setDisableItemLimit: (disable: boolean) => set({ disableItemLimit: disable }),

      // Filter actions
      setFilters: (filters: Partial<FilterState>) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => set({ filters: defaultFilters }),

      // Loading/Error
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      // Notion config
      setNotionConfig: (config: NotionConfig | null) => set({ notionConfig: config }),

      /**
       * Builds a hierarchical tree structure from filtered work items.
       * Delegates to the buildTreeNodes utility for actual tree construction.
       *
       * @see buildTreeNodes in utils/treeBuilder.ts for algorithm details
       */
      getTreeNodes: (): TreeNode[] => {
        const state = get();
        const filteredItems = state.getFilteredItems();

        return buildTreeNodes(filteredItems, {
          expandedIds: state.expandedIds,
          selectedItemId: state.selectedItemId,
          focusedItemId: state.focusedItemId,
        });
      },

      getFilteredItems: (): WorkItem[] => {
        const state = get();
        const { filters, focusedItemId, items, hideOrphanItems, showOnlyOrphans } = state;
        const allItems = Array.from(items.values());

        // Collect focused item and all its ancestors - these bypass filters
        // This ensures the tree path to the focused item remains visible
        const focusedPathIds = focusedItemId
          ? collectAncestorIds(focusedItemId, items)
          : new Set<string>();

        // Check if any filters are active
        const hasIncludeFilters = hasActiveIncludeFilters(filters);
        const hasExcludeFilters = hasActiveExcludeFilters(filters);

        // Legacy filterMode: 'hide' support - convert to exclude filters logic
        const isHideMode = filters.filterMode === 'hide';

        return allItems.filter(item => {
          // Items in the focused path always bypass filters to maintain tree structure
          if (focusedPathIds.has(item.id)) {
            return true;
          }

          // Search query is always applied first
          if (!itemMatchesSearch(item, filters.searchQuery)) {
            return false;
          }

          // Step 1: Check exclude filters - if item matches any exclude, hide it
          if (hasExcludeFilters && itemMatchesExcludeFilters(item, filters)) {
            return false;
          }

          // Step 2: Handle legacy filterMode: 'hide' - include filters act as exclude
          if (isHideMode && hasIncludeFilters) {
            return !itemMatchesIncludeFilters(item, filters);
          }

          // Step 3: Check include filters - if include filters are set, item must match
          if (hasIncludeFilters && !itemMatchesIncludeFilters(item, filters)) {
            return false;
          }

          // Step 4: Orphan filtering (global)
          return applyOrphanFilter(item, items, showOnlyOrphans, hideOrphanItems);
        });
      },

      getOrphanCount: (): number => {
        const state = get();
        const items = state.items;
        let count = 0;
        for (const item of items.values()) {
          if (isOrphanItem(item, items)) {
            count++;
          }
        }
        return count;
      },

      getStats: (): DashboardStats => {
        const state = get();
        const items = Array.from(state.items.values());

        // Dynamic status counting
        const byStatus: Record<string, number> = {};

        const byType: Record<ItemType, number> = {
          mission: 0,
          problem: 0,
          solution: 0,
          design: 0,
          project: 0,
        };

        const byPriority: Record<Priority, number> = {
          P0: 0,
          P1: 0,
          P2: 0,
          P3: 0,
        };

        let overdueItems = 0;
        let completedItems = 0;
        let blockedItems = 0;
        const now = new Date();

        items.forEach(item => {
          // Count by original status
          byStatus[item.status] = (byStatus[item.status] || 0) + 1;

          byType[item.type]++;
          if (item.priority) {
            byPriority[item.priority]++;
          }

          // Check status category for completion/blocked counts
          const category = getStatusCategory(item.status);
          if (category === 'completed') {
            completedItems++;
          }
          if (category === 'blocked') {
            blockedItems++;
          }

          if (item.dueDate && new Date(item.dueDate) < now && category !== 'completed') {
            overdueItems++;
          }
        });

        const totalItems = items.length;
        const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        return {
          totalItems,
          byStatus,
          byType,
          byPriority,
          completionRate,
          overdueItems,
          blockedItems,
        };
      },

      /**
       * Get the path from root to a specific item.
       * Delegates to the getItemPath utility for actual path construction.
       *
       * @see getItemPath in utils/treeBuilder.ts for algorithm details
       */
      getItemPath: (id: string): WorkItem[] => {
        const state = get();
        return getItemPathUtil(id, state.items);
      },
    }),
    {
      name: 'notion-tree-storage',
      partialize: state => ({
        expandedIds: Array.from(state.expandedIds),
        viewMode: state.viewMode,
        hideOrphanItems: state.hideOrphanItems,
        showOnlyOrphans: state.showOnlyOrphans,
        disableItemLimit: state.disableItemLimit,
        filters: state.filters,
        notionConfig: state.notionConfig,
      }),
      merge: (persisted, current) => {
        try {
          // Handle undefined or null persisted state
          if (!persisted || typeof persisted !== 'object') {
            return current;
          }
          const persistedState = persisted as Partial<StoreState> & { expandedIds?: string[] };
          // Validate expandedIds is an array before converting to Set
          const expandedIdsArray = Array.isArray(persistedState.expandedIds)
            ? persistedState.expandedIds.filter(id => typeof id === 'string')
            : [];
          return {
            ...current,
            ...persistedState,
            expandedIds: new Set(expandedIdsArray),
          };
        } catch (error) {
          logger.store.warn('Failed to merge persisted state, using defaults:', error);
          return current;
        }
      },
    }
  )
);

export default useStore;
