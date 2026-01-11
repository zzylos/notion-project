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
  StatusFilterCategory,
} from '../types';
import { getStatusCategory } from '../utils/colors';
import { buildTreeNodes, getItemPath as getItemPathUtil } from '../utils/treeBuilder';
import { getStatusFilterCategory, STATUS_FILTER_CATEGORIES, TYPE_ORDER } from '../constants';

interface StoreState {
  // Data
  items: Map<string, WorkItem>;

  // UI State
  selectedItemId: string | null;
  expandedIds: Set<string>;
  viewMode: ViewMode;

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
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setNotionConfig: (config: NotionConfig | null) => void;

  // Computed values
  getTreeNodes: () => TreeNode[];
  getFilteredItems: () => WorkItem[];
  getStats: () => DashboardStats;
  getItemPath: (id: string) => WorkItem[];
}

/**
 * Default filter state - shows everything by default.
 * Users can then deselect what they don't want to see.
 *
 * Filter logic: items are shown only if they match ALL selected filters.
 * Empty array = show all (no filter applied for that dimension).
 */
const defaultFilters: FilterState = {
  types: [...TYPE_ORDER], // Show all types by default
  statusCategories: [...STATUS_FILTER_CATEGORIES], // Show all status categories by default
  owners: [], // Empty = show all owners (no owner filter)
  searchQuery: '',
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: new Map(),
      selectedItemId: null,
      expandedIds: new Set(),
      viewMode: 'tree',
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

      // View mode
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

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

      // Computed: build tree nodes
      getTreeNodes: (): TreeNode[] => {
        const state = get();
        const filteredItems = state.getFilteredItems();

        return buildTreeNodes(filteredItems, {
          expandedIds: state.expandedIds,
          selectedItemId: state.selectedItemId,
          focusedItemId: null,
        });
      },

      // Computed: filter items
      getFilteredItems: (): WorkItem[] => {
        const state = get();
        const { filters, items } = state;
        const allItems = Array.from(items.values());

        return allItems.filter(item => {
          // Search query filter (always applies if set)
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesTitle = item.title.toLowerCase().includes(query);
            const matchesDesc = item.description?.toLowerCase().includes(query);
            if (!matchesTitle && !matchesDesc) return false;
          }

          // Type filter: must be in selected types (empty = show none)
          if (filters.types.length === 0 || !filters.types.includes(item.type)) {
            return false;
          }

          // Status category filter: map item's status to category, must be selected
          const itemStatusCategory = getStatusFilterCategory(item.status);
          if (
            filters.statusCategories.length === 0 ||
            !filters.statusCategories.includes(itemStatusCategory)
          ) {
            return false;
          }

          // Owner filter: if owners are selected, item must match one of them
          // Empty owners array = show all owners (no filter)
          if (filters.owners.length > 0) {
            if (!item.owner || !filters.owners.includes(item.owner.id)) {
              return false;
            }
          }

          return true;
        });
      },

      // Computed: get stats
      getStats: (): DashboardStats => {
        const state = get();
        const items = Array.from(state.items.values());

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

        let completedItems = 0;
        let blockedItems = 0;
        let overdueItems = 0;
        const now = new Date();

        items.forEach(item => {
          byStatus[item.status] = (byStatus[item.status] || 0) + 1;
          byType[item.type]++;
          if (item.priority) {
            byPriority[item.priority]++;
          }

          const category = getStatusCategory(item.status);
          if (category === 'completed') completedItems++;
          if (category === 'blocked') blockedItems++;

          if (item.dueDate && category !== 'completed') {
            const dueDate = new Date(item.dueDate);
            if (dueDate < now) overdueItems++;
          }
        });

        return {
          totalItems: items.length,
          byStatus,
          byType,
          byPriority,
          completionRate: items.length > 0 ? (completedItems / items.length) * 100 : 0,
          overdueItems,
          blockedItems,
        };
      },

      // Get path from root to item
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
        filters: state.filters,
        notionConfig: state.notionConfig,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') {
          return current;
        }
        const persistedState = persisted as Partial<StoreState> & { expandedIds?: string[] };
        const expandedIdsArray = Array.isArray(persistedState.expandedIds)
          ? persistedState.expandedIds.filter(id => typeof id === 'string')
          : [];
        return {
          ...current,
          ...persistedState,
          expandedIds: new Set(expandedIdsArray),
        };
      },
    }
  )
);

export default useStore;
