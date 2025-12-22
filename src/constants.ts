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
 * Common property name aliases for flexible matching
 */
export const PROPERTY_ALIASES: Record<string, string[]> = {
  title: ['Name', 'Title'],
  status: ['Status', 'State'],
  priority: ['Priority', 'Importance'],
  owner: ['Owner', 'Assignee', 'Assigned To', 'Assigned'],
  parent: ['Parent', 'Parent Item', 'Parent item'],
  progress: ['Progress', 'Completion', '%'],
  dueDate: ['Deadline', 'Due Date', 'Due', 'Due date', 'End Date'],
  tags: ['Tags', 'Labels', 'Categories'],
} as const;
