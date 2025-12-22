/**
 * Work item types in the opportunity tree.
 * Each type corresponds to a Notion database and represents a different level
 * in the opportunity hierarchy.
 *
 * - mission: High-level objectives and goals
 * - problem: Issues and challenges to solve
 * - solution: Proposed approaches to problems
 * - project: Execution plans and initiatives
 * - design: Concrete deliverables and outputs
 */
export type ItemType = 'mission' | 'problem' | 'solution' | 'design' | 'project';

/**
 * Status of work items - dynamic string type.
 * Preserves the original Notion status value for display,
 * while using StatusCategory internally for color mapping.
 */
export type ItemStatus = string;

/**
 * Known status categories for color mapping.
 * Used internally to map dynamic Notion status strings to consistent colors.
 *
 * @see getStatusCategory() in utils/colors.ts for mapping logic
 */
export type StatusCategory = 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed';

/**
 * Priority levels for work items.
 * P0 is highest priority (Critical), P3 is lowest (Low).
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Owner/person information from Notion.
 * Represents a user assigned to or responsible for a work item.
 */
export interface Owner {
  /** Notion user ID */
  id: string;
  /** Display name */
  name: string;
  /** Email address (may be empty for external users) */
  email: string;
  /** Avatar image URL from Notion */
  avatar?: string;
}

/**
 * A work item in the opportunity tree.
 * Represents a single unit of work that can be an objective, problem, solution,
 * project, or deliverable.
 */
export interface WorkItem {
  /** Unique identifier (Notion page ID) */
  id: string;
  /** Display title of the work item */
  title: string;
  /** Type determined by which Notion database the item comes from */
  type: ItemType;
  /** Current status - preserves original Notion status string for display */
  status: ItemStatus;
  /** Priority level (P0=Critical to P3=Low) */
  priority?: Priority;
  /** Completion percentage (0-100) */
  progress?: number;
  /** Primary owner/responsible person */
  owner?: Owner;
  /**
   * Additional assigned people from Notion.
   * Currently populated from Notion but not displayed in UI.
   * Reserved for future multi-assignee support.
   */
  assignees?: Owner[];
  /** Parent work item ID for hierarchical relationships */
  parentId?: string;
  /** IDs of child work items (computed from parentId relationships) */
  children?: string[];
  /** Rich text description from Notion */
  description?: string;
  /** Target completion date (ISO string) */
  dueDate?: string;
  /** Creation timestamp from Notion */
  createdAt: string;
  /** Last modification timestamp from Notion */
  updatedAt: string;
  /** Original Notion page ID (same as id) */
  notionPageId?: string;
  /** URL to open the item in Notion */
  notionUrl?: string;
  /** Tags/labels from Notion multi-select */
  tags?: string[];
  /**
   * IDs of work items this depends on.
   * Reserved for future dependency tracking feature.
   * Not currently populated or used.
   */
  dependencies?: string[];
  /** IDs of work items blocking this one */
  blockedBy?: string[];
}

/**
 * Tree node representation for visualization.
 * Wraps a WorkItem with hierarchy and UI state information.
 */
export interface TreeNode {
  /** The underlying work item */
  item: WorkItem;
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
 * Filter state for filtering work items.
 * Multiple filters are combined with AND logic.
 */
export interface FilterState {
  /** Filter by item type (empty = all types) */
  types: ItemType[];
  /** Filter by status (empty = all statuses) */
  statuses: ItemStatus[];
  /** Filter by priority (empty = all priorities) */
  priorities: Priority[];
  /** Filter by owner IDs (empty = all owners) */
  owners: string[];
  /** Text search across title, description, and tags */
  searchQuery: string;
  /** Show only items owned by the current user */
  showOnlyMyItems: boolean;
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
 * - list: Virtualized table view
 */
export type ViewMode = 'tree' | 'canvas' | 'kanban' | 'timeline' | 'list';

/**
 * Configuration for a single Notion database.
 * Each database is mapped to a specific ItemType, allowing items from
 * different databases to be combined into a unified hierarchy.
 *
 * @example
 * // Configure a Problems database
 * {
 *   databaseId: 'abc123...',
 *   type: 'problem',
 *   mappings: { status: 'State' } // Override default 'Status' property name
 * }
 */
export interface DatabaseConfig {
  /**
   * Notion database ID (UUID format).
   * Found in the database URL: notion.so/workspace/{databaseId}
   */
  databaseId: string;
  /**
   * What ItemType items from this database should be assigned.
   * Determines the item's type in the hierarchy and its display color/icon.
   */
  type: ItemType;
  /**
   * Property name mappings specific to this database.
   * Overrides the default mappings for cases where this database
   * uses different column names than others.
   */
  mappings?: Partial<PropertyMappings>;
}

/**
 * Property name mappings for connecting Notion columns to work item fields.
 * These names should match the property names in your Notion databases.
 *
 * Common aliases (e.g., "Owner" vs "Assignee") are handled automatically
 * by the service via fuzzy matching.
 *
 * @see PROPERTY_ALIASES in constants.ts for supported aliases
 */
export interface PropertyMappings {
  /** Title property (usually "Name") - auto-detected if not specified */
  title: string;
  /** Status property (select or status type) */
  status: string;
  /** Priority property (select type, expects P0-P3 or High/Medium/Low) */
  priority: string;
  /** Owner/assignee property (people type) */
  owner: string;
  /** Parent relation property (relation type) */
  parent: string;
  /** Progress property (number type, 0-100) */
  progress: string;
  /** Due date property (date type) */
  dueDate: string;
  /** Tags property (multi-select type) */
  tags: string;
}

/**
 * Complete Notion configuration for the application.
 * Supports both the new multi-database format and legacy single-database format.
 *
 * @example
 * // New multi-database format
 * {
 *   apiKey: 'secret_...',
 *   databases: [
 *     { databaseId: 'abc...', type: 'problem' },
 *     { databaseId: 'def...', type: 'solution' },
 *   ],
 *   defaultMappings: { title: 'Name', status: 'Status', ... }
 * }
 */
export interface NotionConfig {
  /** Notion API integration token (starts with "secret_") */
  apiKey: string;
  /**
   * Array of database configurations.
   * Each database is fetched separately and items are merged by type.
   */
  databases: DatabaseConfig[];
  /**
   * Default property mappings applied to all databases.
   * Individual databases can override these via their own mappings.
   */
  defaultMappings: PropertyMappings;
  /**
   * @deprecated Legacy single database ID. Use `databases` array instead.
   */
  databaseId?: string;
  /**
   * @deprecated Legacy mappings format. Use `defaultMappings` instead.
   */
  mappings?: PropertyMappings & { type: string };
}

// Application state
export interface AppState {
  items: Map<string, WorkItem>;
  treeNodes: TreeNode[];
  selectedItemId: string | null;
  focusedItemId: string | null;
  expandedIds: Set<string>;
  filters: FilterState;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  notionConfig: NotionConfig | null;
}

// Stats for dashboard
export interface DashboardStats {
  totalItems: number;
  byStatus: Record<string, number>;
  byType: Record<ItemType, number>;
  byPriority: Record<Priority, number>;
  completionRate: number;
  overdueItems: number;
  blockedItems: number;
}
