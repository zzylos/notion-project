import type { ItemType, Priority, ViewMode } from './types';
import { CACHE as SHARED_CACHE_VALUES } from '../shared/constants';

// Re-export shared constants for convenient imports
export { PROPERTY_ALIASES, DEFAULT_PROPERTY_MAPPINGS, NOTION_API } from '../shared/constants';

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
} as const;

/**
 * View rendering limits for performance
 */
export const VIEW_LIMITS = {
  /** Maximum items to render before showing a warning and limiting */
  ITEM_LIMIT: 500,
} as const;

/**
 * Notion API constants
 */
export const NOTION = {
  /** Cache timeout in milliseconds (5 minutes) */
  CACHE_TIMEOUT: 5 * 60 * 1000,
  /** Items per page when fetching from Notion */
  PAGE_SIZE: 100,
  /** Base URL for Notion API */
  API_BASE: 'https://api.notion.com/v1',
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
 * Cache-related constants
 * Extends shared constants with client-specific properties
 */
export const CACHE = {
  ...SHARED_CACHE_VALUES,
  /** Persistent cache timeout in milliseconds (24 hours) */
  PERSISTENT_TIMEOUT_MS: 24 * 60 * 60 * 1000,
  /** LocalStorage key prefix for cache entries */
  KEY_PREFIX: 'notion-cache-',
  /** LocalStorage key for cache metadata */
  METADATA_KEY: 'notion-cache-metadata',
  /** Throttle duration for page progress callbacks in milliseconds */
  PAGE_PROGRESS_THROTTLE_MS: 100,
} as const;

/**
 * Edge styling constants for canvas view
 */
export const EDGE_STYLES = {
  /** Stroke width for edges */
  STROKE_WIDTH: 2,
  /** Stroke dasharray for blocked edges */
  BLOCKED_DASH_ARRAY: '5,5',
  /** Color for blocked-by edges */
  BLOCKED_COLOR: '#ef4444',
  /** Font size for edge labels */
  LABEL_FONT_SIZE: 10,
} as const;

/**
 * Animation and timing constants
 */
export const TIMING = {
  /** Debounce delay for search input in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,
  /** Transition duration for UI animations in milliseconds */
  TRANSITION_MS: 200,
  /** Auto-save delay in milliseconds */
  AUTO_SAVE_DELAY_MS: 1000,
} as const;

/**
 * Default CORS proxy for browser-based Notion API calls
 */
export const DEFAULT_CORS_PROXY = 'https://corsproxy.io/?';

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
 * Simplified to 3 main categories: Not Started, In Progress, Done.
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
    'Blocked',
    'blocked',
    'On Hold',
    'Waiting',
    'Paused',
  ],
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
