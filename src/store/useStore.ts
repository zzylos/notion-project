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

interface StoreState {
  // Data
  items: Map<string, WorkItem>;

  // UI State
  selectedItemId: string | null;
  focusedItemId: string | null;
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
  setFocusedItem: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToItem: (id: string) => void;

  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setNotionConfig: (config: NotionConfig | null) => void;

  // Computed values (not really computed in Zustand, but helper methods)
  getTreeNodes: () => TreeNode[];
  getFilteredItems: () => WorkItem[];
  getStats: () => DashboardStats;
  getItemPath: (id: string) => WorkItem[];
}

const defaultFilters: FilterState = {
  types: [],
  statuses: [],
  priorities: [],
  owners: [],
  searchQuery: '',
  showOnlyMyItems: false,
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

      // Helper methods
      getTreeNodes: () => {
        const state = get();
        const filteredItems = state.getFilteredItems();
        const filteredIds = new Set(filteredItems.map(i => i.id));

        // Build tree from items with cycle detection
        const buildTree = (parentId: string | undefined, level: number, ancestors: Set<string>): TreeNode[] => {
          const children = filteredItems.filter(item => item.parentId === parentId);
          return children.map(item => {
            // Check for circular reference
            if (ancestors.has(item.id)) {
              console.warn(`[Store] Circular reference detected in tree at item: ${item.id}`);
              return {
                item,
                children: [], // Stop recursion to prevent infinite loop
                level,
                isExpanded: state.expandedIds.has(item.id),
                isSelected: state.selectedItemId === item.id,
                isHighlighted: state.focusedItemId === item.id,
              };
            }

            const newAncestors = new Set(ancestors);
            newAncestors.add(item.id);

            return {
              item,
              children: buildTree(item.id, level + 1, newAncestors),
              level,
              isExpanded: state.expandedIds.has(item.id),
              isSelected: state.selectedItemId === item.id,
              isHighlighted: state.focusedItemId === item.id,
            };
          });
        };

        // Start with root items (no parent or parent not in filtered set)
        const rootItems = filteredItems.filter(
          item => !item.parentId || !filteredIds.has(item.parentId)
        );

        return rootItems.map(item => {
          const ancestors = new Set<string>([item.id]);
          return {
            item,
            children: buildTree(item.id, 1, ancestors),
            level: 0,
            isExpanded: state.expandedIds.has(item.id),
            isSelected: state.selectedItemId === item.id,
            isHighlighted: state.focusedItemId === item.id,
          };
        });
      },

      getFilteredItems: () => {
        const state = get();
        const { filters } = state;
        const allItems = Array.from(state.items.values());

        return allItems.filter(item => {
          // Type filter
          if (filters.types.length > 0 && !filters.types.includes(item.type)) {
            return false;
          }

          // Status filter
          if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
            return false;
          }

          // Priority filter
          if (filters.priorities.length > 0) {
            if (!item.priority || !filters.priorities.includes(item.priority)) {
              return false;
            }
          }

          // Owner filter
          if (filters.owners.length > 0) {
            if (!item.owner || !filters.owners.includes(item.owner.id)) {
              return false;
            }
          }

          // Search query
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const titleMatch = item.title.toLowerCase().includes(query);
            const descMatch = item.description?.toLowerCase().includes(query);
            const tagMatch = item.tags?.some(tag => tag.toLowerCase().includes(query));
            if (!titleMatch && !descMatch && !tagMatch) {
              return false;
            }
          }

          return true;
        });
      },

      getStats: (): DashboardStats => {
        const state = get();
        const items = Array.from(state.items.values());

        // Dynamic status counting
        const byStatus: Record<string, number> = {};

        const byType: Record<ItemType, number> = {
          'mission': 0,
          'problem': 0,
          'solution': 0,
          'design': 0,
          'project': 0,
        };

        const byPriority: Record<Priority, number> = {
          'P0': 0,
          'P1': 0,
          'P2': 0,
          'P3': 0,
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

      getItemPath: (id: string): WorkItem[] => {
        const state = get();
        const path: WorkItem[] = [];
        const visited = new Set<string>(); // Track visited IDs to detect cycles
        let currentId: string | undefined = id;

        while (currentId) {
          // Check for circular reference
          if (visited.has(currentId)) {
            console.warn(`[Store] Circular parent reference detected at item: ${currentId}`);
            break;
          }
          visited.add(currentId);

          const item = state.items.get(currentId);
          if (item) {
            path.unshift(item);
            currentId = item.parentId;
          } else {
            break;
          }
        }

        return path;
      },
    }),
    {
      name: 'notion-tree-storage',
      partialize: (state) => ({
        expandedIds: Array.from(state.expandedIds),
        viewMode: state.viewMode,
        filters: state.filters,
        notionConfig: state.notionConfig,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<StoreState> & { expandedIds?: string[] };
        return {
          ...current,
          ...persistedState,
          expandedIds: new Set(persistedState.expandedIds || []),
        };
      },
    }
  )
);

export default useStore;
