import type { ItemType, ViewMode } from './types';

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
export const VIEW_MODES: ViewMode[] = ['tree', 'canvas', 'kanban'];

/**
 * Item type order for consistent display
 */
export const TYPE_ORDER: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

/**
 * Simplified status filter categories.
 * All Notion statuses are consolidated into 3 simple categories.
 */
export const STATUS_FILTER_CATEGORIES = ['not-started', 'in-progress', 'finished'] as const;

/**
 * Display labels for status filter categories
 */
export const STATUS_FILTER_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  finished: 'Finished',
} as const;

/**
 * Maps raw Notion status strings to simplified filter categories.
 * Case-insensitive matching is performed by normalizing to lowercase.
 *
 * Categories:
 * - not-started: Items that haven't been worked on yet
 * - in-progress: Items actively being worked on (includes all work phases)
 * - finished: Items that are done, closed, canceled, or otherwise complete
 */
export const STATUS_TO_FILTER_CATEGORY: Record<string, 'not-started' | 'in-progress' | 'finished'> =
  {
    // Not Started
    '1-not started': 'not-started',
    'not started': 'not-started',
    backlog: 'not-started',
    planning: 'not-started',
    'to do': 'not-started',
    new: 'not-started',

    // In Progress (all active work phases)
    '2-analysis/research': 'in-progress',
    '3-solutioning': 'in-progress',
    '4-prioritization': 'in-progress',
    '5-scheduling': 'in-progress',
    '6-project in progress': 'in-progress',
    'in progress': 'in-progress',
    recurring: 'in-progress',
    active: 'in-progress',
    doing: 'in-progress',
    wip: 'in-progress',
    working: 'in-progress',
    analysis: 'in-progress',
    research: 'in-progress',
    solutioning: 'in-progress',

    // Finished (done, closed, or terminal states)
    '7-post mortem': 'finished',
    '8-closed': 'finished',
    done: 'finished',
    closed: 'finished',
    completed: 'finished',
    complete: 'finished',
    canceled: 'finished',
    cancelled: 'finished',
    duplicate: 'finished',
    resolved: 'finished',
    shipped: 'finished',
    "won't do": 'finished',
    wontfix: 'finished',
  } as const;

/**
 * Gets the filter category for a status string.
 * Falls back to 'not-started' for unknown statuses.
 */
export function getStatusFilterCategory(status: string): 'not-started' | 'in-progress' | 'finished' {
  const normalized = status.toLowerCase().trim();
  return STATUS_TO_FILTER_CATEGORY[normalized] ?? 'not-started';
}
