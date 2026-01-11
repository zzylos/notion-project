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
  FetchItemsResponse,
} from '../../shared/types';

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
 * Simplified status category for filtering.
 * All Notion statuses are mapped to one of these three categories.
 */
export type StatusFilterCategory = 'not-started' | 'in-progress' | 'finished';

/**
 * Filter state for filtering work items.
 *
 * Design principle: Everything is hidden by default.
 * Users explicitly select what they want to see.
 * This reduces confusion and provides a simpler mental model.
 *
 * Multiple filters are combined with AND logic.
 */
export interface FilterState {
  /** Types to show (empty = nothing shown for types, must select) */
  types: SharedItemType[];
  /** Status categories to show (empty = nothing shown for statuses, must select) */
  statusCategories: StatusFilterCategory[];
  /** Owner IDs to show (empty = nothing shown for owners, must select) */
  owners: string[];
  /** Text search across title and description */
  searchQuery: string;
}

/**
 * Available view modes for displaying work items.
 *
 * - tree: Hierarchical tree view (default)
 * - canvas: React Flow node-based visualization
 * - kanban: Board view grouped by status
 */
export type ViewMode = 'tree' | 'canvas' | 'kanban';

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
