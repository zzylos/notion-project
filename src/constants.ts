import type { ItemType, Priority, ViewMode } from './types';

// Re-export shared constants for convenient imports
export {
  PROPERTY_ALIASES,
  DEFAULT_PROPERTY_MAPPINGS,
  NOTION_API,
  ITEM_TYPES,
} from '../shared/constants';

/**
 * Canvas view layout constants
 */
export const CANVAS = {
  /** Horizontal spacing between nodes */
  HORIZONTAL_SPACING: 400,
  /** Vertical spacing between nodes */
  VERTICAL_SPACING: 280,
  /** Width of each node */
  NODE_WIDTH: 250,
  /** Extra gap between separate trees */
  TREE_GAP: 200,
} as const;

/**
 * Tree view constants
 */
export const TREE = {
  /** Maximum depth to prevent stack overflow with circular references */
  MAX_DEPTH: 50,
  /** Indentation per level in pixels */
  INDENT_PX: 24,
  /** Maximum iterations for ancestor collection to prevent infinite loops */
  MAX_ANCESTOR_ITERATIONS: 100,
  /** Maximum iterations for descendant collection (BFS) to prevent infinite loops */
  MAX_DESCENDANT_ITERATIONS: 1000,
} as const;

/**
 * Cache configuration constants
 */
export const CACHE = {
  /** Maximum number of entries in LRU caches before eviction */
  MAX_SIZE: 1000,
  /** Percentage of cache to evict when full (0.1 = 10%) */
  EVICTION_RATIO: 0.1,
} as const;

/**
 * View rendering limits for performance
 */
export const VIEW_LIMITS = {
  /** Maximum items to render before showing a warning and limiting */
  ITEM_LIMIT: 500,
} as const;

/**
 * Refresh rate limiting constants
 */
export const REFRESH = {
  /** Default cooldown between refreshes in milliseconds (2 minutes) */
  DEFAULT_COOLDOWN_MS: 2 * 60 * 1000,
  /** LocalStorage key for storing last refresh timestamp */
  LAST_REFRESH_KEY: 'notion-last-refresh',
} as const;

/**
 * Available view modes
 */
export const VIEW_MODES: ViewMode[] = ['tree', 'canvas', 'kanban', 'timeline'];

/**
 * Item type order for consistent display
 */
export const TYPE_ORDER: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

/**
 * Priority order for consistent display
 */
export const PRIORITY_ORDER: Priority[] = ['P0', 'P1', 'P2', 'P3'];

/**
 * Status groups for combining similar statuses in the filter UI.
 * Uses exact string matching for known Notion status values.
 *
 * Note: For color assignment, see STATUS_CATEGORY_KEYWORDS in utils/colors.ts
 * which uses fuzzy keyword matching and maps to StatusCategory values.
 *
 * @see getStatusCategory() in utils/colors.ts for color mapping
 */
export const STATUS_GROUPS: Record<string, string[]> = {
  'Not Started': ['Not started', 'Not Started', '1-Not started', 'Backlog', 'To Do', 'New'],
  'In Progress': [
    'In progress',
    'In Progress',
    '6-Project in progress',
    'Active',
    'Doing',
    'WIP',
    'Planning',
    '2-Analysis/Research',
    '3-Solutioning',
    '4-Prioritization',
    '5-Scheduling',
    'Analysis',
    'Research',
    'Solutioning',
  ],
  Blocked: ['Blocked', 'blocked', 'On Hold', 'On hold', 'Waiting', 'Paused', 'Stalled'],
  Done: [
    'Done',
    '8-Closed',
    '7-Post mortem',
    'Completed',
    'Complete',
    'Closed',
    'Resolved',
    'Shipped',
    'Canceled',
    'Cancelled',
    'Duplicate',
    "Won't Do",
    'Wontfix',
  ],
} as const;

/**
 * Maps filter UI group names to StatusCategory values for color consistency.
 * Use this when you need to get the color category for a status group.
 */
export const STATUS_GROUP_TO_CATEGORY: Record<string, string> = {
  'Not Started': 'not-started',
  'In Progress': 'in-progress',
  Blocked: 'blocked',
  Done: 'completed',
} as const;

/**
 * Reverse lookup map: status string (lowercase) -> group name.
 * Pre-computed once at module load for efficient lookups in FilterPanel.
 */
export const STATUS_TO_GROUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    for (const status of statuses) {
      map.set(status.toLowerCase(), group);
    }
  }
  return map;
})();
