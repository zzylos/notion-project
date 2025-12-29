/**
 * Type definitions for the Notion Opportunity Tree Visualizer.
 *
 * This module re-exports shared types from the shared/ directory and defines
 * client-specific types that are only used in the frontend.
 */

// Import shared types for use in this module
import type {
  ItemType as SharedItemType,
  ItemStatus as SharedItemStatus,
  Priority as SharedPriority,
  WorkItem as SharedWorkItem,
  NotionConfig as SharedNotionConfig,
} from '../../shared/types';

// Re-export all shared types (single source of truth)
export type {
  ItemType,
  ItemStatus,
  Priority,
  Owner,
  WorkItem,
  DatabaseConfig,
  PropertyMappings,
  NotionConfig,
  NotionPage,
  NotionPropertyValue,
  NotionQueryResponse,
} from '../../shared/types';

/**
 * Map of ItemType to database IDs.
 * Used for configuration where each item type has a corresponding database.
 */
export type DatabaseIdMap = Record<SharedItemType, string>;

/**
 * Known status categories for color mapping.
 * Used internally to map dynamic Notion status strings to consistent colors.
 *
 * @see getStatusCategory() in utils/colors.ts for mapping logic
 */
export type StatusCategory = 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed';

/**
 * Tree node representation for visualization.
 * Wraps a WorkItem with hierarchy and UI state information.
 */
export interface TreeNode {
  /** The underlying work item */
  item: SharedWorkItem;
  /** Child tree nodes */
  children: TreeNode[];
  /** Depth in the tree (0 = root) */
  level: number;
  /** Whether this node's children are visible */
  isExpanded: boolean;
  /** Whether this node is currently selected */
  isSelected: boolean;
  /** Whether this node should be visually highlighted (e.g., focused) */
  isHighlighted: boolean;
}

/**
 * Filter mode - whether filters show or hide matching items
 */
export type FilterMode = 'show' | 'hide';

/**
 * Filter state for filtering work items.
 * Multiple filters are combined with AND logic.
 * Include arrays select which items to show (empty = all).
 * Exclude arrays remove items from the result (applied after include).
 */
export interface FilterState {
  /** Filter by item type - only show these types (empty = all types) */
  types: SharedItemType[];
  /** Exclude these types - always hide regardless of other filters */
  excludeTypes: SharedItemType[];
  /** Filter by status - only show these statuses (empty = all statuses) */
  statuses: SharedItemStatus[];
  /** Exclude these statuses - always hide regardless of other filters */
  excludeStatuses: SharedItemStatus[];
  /** Filter by priority - only show these priorities (empty = all priorities) */
  priorities: SharedPriority[];
  /** Exclude these priorities - always hide regardless of other filters */
  excludePriorities: SharedPriority[];
  /** Filter by owner IDs - only show these owners (empty = all owners) */
  owners: string[];
  /** Exclude these owner IDs - always hide regardless of other filters */
  excludeOwners: string[];
  /** Text search across title, description, and tags */
  searchQuery: string;
  /** Show only items owned by the current user */
  showOnlyMyItems: boolean;
  /** @deprecated Use include/exclude arrays instead. Legacy filter mode for backwards compatibility. */
  filterMode: FilterMode;
  /** Optional date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Available view modes for displaying work items.
 *
 * - tree: Hierarchical tree view (default)
 * - canvas: React Flow node-based visualization
 * - kanban: Board view grouped by status
 * - timeline: Chronological view by due date
 */
export type ViewMode = 'tree' | 'canvas' | 'kanban' | 'timeline';

/**
 * Application state interface.
 */
export interface AppState {
  items: Map<string, SharedWorkItem>;
  treeNodes: TreeNode[];
  selectedItemId: string | null;
  focusedItemId: string | null;
  expandedIds: Set<string>;
  filters: FilterState;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  notionConfig: SharedNotionConfig | null;
}

/**
 * Stats for dashboard display.
 */
export interface DashboardStats {
  totalItems: number;
  byStatus: Record<string, number>;
  byType: Record<SharedItemType, number>;
  byPriority: Record<SharedPriority, number>;
  completionRate: number;
  overdueItems: number;
  blockedItems: number;
}

// Re-export Notion API types from the notion module
export type { FetchProgress, FetchProgressCallback, FetchOptions } from './notion';
