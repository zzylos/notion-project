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
