import type { ItemType, Priority, ViewMode } from './types';

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
 */
export const CACHE = {
  /** Persistent cache timeout in milliseconds (24 hours) */
  PERSISTENT_TIMEOUT_MS: 24 * 60 * 60 * 1000,
  /** LocalStorage key prefix for cache entries */
  KEY_PREFIX: 'notion-cache-',
  /** LocalStorage key for cache metadata */
  METADATA_KEY: 'notion-cache-metadata',
  /** Maximum wait time for force refresh in milliseconds (30 seconds) */
  FORCE_REFRESH_MAX_WAIT_MS: 30000,
  /** Polling interval for waiting on refresh in milliseconds */
  REFRESH_POLL_INTERVAL_MS: 100,
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
export const VIEW_MODES: ViewMode[] = ['tree', 'canvas', 'kanban', 'list', 'timeline'];

/**
 * Item type order for consistent display
 */
export const TYPE_ORDER: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

/**
 * Priority order for consistent display
 */
export const PRIORITY_ORDER: Priority[] = ['P0', 'P1', 'P2', 'P3'];

/**
 * Default property mappings for Notion databases
 */
export const DEFAULT_PROPERTY_MAPPINGS = {
  title: 'Name',
  status: 'Status',
  priority: 'Priority',
  owner: 'Owner',
  parent: 'Parent',
  progress: 'Progress',
  dueDate: 'Deadline',
  tags: 'Tags',
} as const;

/**
 * Common property name aliases for flexible matching.
 * Used by notionService to find properties with different names.
 */
export const PROPERTY_ALIASES: Record<string, string[]> = {
  Status: ['Status', 'State', 'Stage', 'Phase'],
  Priority: ['Priority', 'Importance', 'Urgency', 'Level', 'P'],
  Parent: [
    'Parent',
    'Parent Item',
    'Parent Task',
    'Belongs To',
    'Part Of',
    'Epic',
    'Initiative',
    'Objective',
    'Problem',
    'Solution',
    'Project',
  ],
  Owner: [
    'Owner',
    'Assignee',
    'Assigned To',
    'Responsible',
    'Lead',
    'Person',
    'People',
    'Assigned',
  ],
  Progress: ['Progress', 'Completion', 'Percent Complete', '% Complete', 'Done %'],
  Deadline: ['Deadline', 'Due Date', 'Due', 'Target Date', 'End Date', 'Finish Date', 'Due By'],
  Tags: ['Tags', 'Labels', 'Categories', 'Keywords'],
} as const;

/**
 * Status groups for combining similar statuses in the filter UI.
 * The display label maps to an array of status strings that should be grouped together.
 * When a group is selected, all underlying statuses are added to the filter.
 */
export const STATUS_GROUPS: Record<string, string[]> = {
  'Not Started': ['Not started', 'Not Started', '1-Not started', 'Backlog', 'To Do', 'New'],
  'In Progress': ['In progress', 'In Progress', '6-Project in progress', 'Active', 'Doing', 'WIP'],
  Planning: [
    'Planning',
    '2-Analysis/Research',
    '3-Solutioning',
    '4-Prioritization',
    '5-Scheduling',
    'Analysis',
    'Research',
    'Solutioning',
  ],
  Blocked: ['Blocked', 'blocked', 'On Hold', 'Waiting', 'Paused'],
  Done: [
    'Done',
    '8-Closed',
    '7-Post mortem',
    'Completed',
    'Complete',
    'Closed',
    'Resolved',
    'Shipped',
  ],
  Canceled: ['Canceled', 'Cancelled', 'Duplicate', "Won't Do", 'Wontfix'],
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
