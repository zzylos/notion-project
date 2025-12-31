/**
 * Shared constants for both client and server.
 * These constants are used by the Notion API integration across the application.
 */

import type { PropertyMappings, ItemType } from './types.js';

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
 * Default property mappings for Notion databases.
 */
export const DEFAULT_PROPERTY_MAPPINGS: PropertyMappings = {
  title: 'Name',
  status: 'Status',
  priority: 'Priority',
  owner: 'Owner',
  parent: 'Parent',
  progress: 'Progress',
  dueDate: 'Deadline',
  tags: 'Tags',
};

/**
 * All item types in hierarchy order (top to bottom).
 * Used for database configuration and display ordering.
 */
export const ITEM_TYPES: readonly ItemType[] = [
  'mission',
  'problem',
  'solution',
  'project',
  'design',
] as const;

/**
 * Notion API constants.
 */
export const NOTION_API = {
  /** Base URL for Notion API */
  BASE_URL: 'https://api.notion.com/v1',
  /** API version header */
  VERSION: '2022-06-28',
  /** Items per page when fetching from Notion */
  PAGE_SIZE: 100,
} as const;

/**
 * Cache-related constants used by both client and server.
 */
export const CACHE = {
  /** Maximum wait time for force refresh in milliseconds (30 seconds) */
  FORCE_REFRESH_MAX_WAIT_MS: 30000,
  /** Polling interval for waiting on refresh in milliseconds */
  REFRESH_POLL_INTERVAL_MS: 100,
} as const;
