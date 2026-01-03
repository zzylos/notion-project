/**
 * Color utilities for work item visualization.
 *
 * This module provides color mapping functions for statuses, types, and priorities.
 *
 * Status Categorization:
 * - Uses fuzzy keyword matching to categorize any status string
 * - Maps to StatusCategory: 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed'
 * - Results are cached for performance (LRU cache with max size from CACHE.MAX_SIZE)
 *
 * @see STATUS_GROUPS in constants.ts for exact-match status grouping (used in filter UI)
 * @see STATUS_GROUP_TO_CATEGORY in constants.ts for mapping between groups and categories
 */

import type { ItemType, Priority, StatusCategory } from '../types';
import { CACHE } from '../constants';

// Status color definitions by category
interface StatusColorSet {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const statusCategoryColors: Record<StatusCategory, StatusColorSet> = {
  'not-started': {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  'in-progress': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  blocked: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  'in-review': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
};

// Cache for consistent color assignment
const statusColorCache = new Map<string, StatusColorSet>();

// Cache for status category lookups (performance optimization)
const statusCategoryCache = new Map<string, StatusCategory>();

/**
 * LRU cache helper: Add or update an entry, evicting least recently used if full.
 * Uses Map's insertion order - entries are ordered by insertion time,
 * so deleting and re-inserting moves the entry to the end (most recently used).
 */
function addToCache<K, V>(cache: Map<K, V>, key: K, value: V): void {
  // Delete first to update position (for LRU behavior)
  cache.delete(key);

  // Evict oldest entries if cache is full
  if (cache.size >= CACHE.MAX_SIZE) {
    // Delete oldest entries (percentage defined in constants)
    const evictCount = Math.floor(CACHE.MAX_SIZE * CACHE.EVICTION_RATIO);
    let count = 0;
    for (const k of cache.keys()) {
      if (count >= evictCount) break;
      cache.delete(k);
      count++;
    }
  }

  cache.set(key, value);
}

/**
 * LRU cache helper: Get an entry and mark it as recently used.
 */
function getFromCache<K, V>(cache: Map<K, V>, key: K): V | undefined {
  const value = cache.get(key);
  if (value !== undefined) {
    // Move to end (most recently used) by delete + re-insert
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

/**
 * Keyword mapping for status categorization.
 * Order matters: checked from top to bottom, first match wins.
 * Each category maps to an array of keywords that indicate that status.
 *
 * Keywords are matched using includes() on the normalized (lowercase, trimmed) status string.
 *
 * Categories:
 * - completed: Work is done, shipped, or closed
 * - blocked: Work is stopped, waiting, or on hold
 * - in-review: Work is being tested, reviewed, or verified
 * - in-progress: Work is actively being done
 * - not-started: Default for unrecognized statuses
 */
const STATUS_CATEGORY_KEYWORDS: Record<StatusCategory, string[]> = {
  completed: [
    'done',
    'complete',
    'finish',
    'closed',
    'resolved',
    'shipped',
    'deployed',
    'live',
    'released',
    'launched',
  ],
  blocked: [
    'block',
    'hold',
    'wait',
    'stuck',
    'pause',
    'duplicate',
    'wontfix',
    'cancelled',
    'canceled',
  ],
  'in-review': [
    'review',
    'test',
    'qa',
    'verif',
    'post mortem',
    'postmortem',
    'staging',
    'approval',
  ],
  'in-progress': [
    'progress',
    'doing',
    'active',
    'wip',
    'working',
    'develop',
    'solutioning',
    'priorit',
    'schedul',
    'analysis',
    'research',
    'project in',
    'implementation',
    'coding',
    'building',
  ],
  'not-started': [], // Default fallback, no keywords needed
};

/**
 * Categorizes a status string to a known StatusCategory for color mapping.
 *
 * Uses fuzzy keyword matching on the normalized (lowercase, trimmed) status
 * string to determine which category it belongs to.
 *
 * Results are cached for performance - each unique status string is only
 * processed once.
 *
 * @param status - The status string from Notion (e.g., "In Progress", "Done")
 * @returns The StatusCategory for color mapping
 *
 * @example
 * getStatusCategory("In Progress")     // returns 'in-progress'
 * getStatusCategory("Completed")       // returns 'completed'
 * getStatusCategory("On Hold")         // returns 'blocked'
 * getStatusCategory("Custom Status")   // returns 'not-started' (default)
 */
export function getStatusCategory(status: string): StatusCategory {
  // Check cache first (using LRU get to update access time)
  const cached = getFromCache(statusCategoryCache, status);
  if (cached) {
    return cached;
  }

  const normalized = status.toLowerCase().trim();

  // Check each category in priority order (completed → blocked → in-review → in-progress)
  const categories: StatusCategory[] = ['completed', 'blocked', 'in-review', 'in-progress'];

  for (const category of categories) {
    const keywords = STATUS_CATEGORY_KEYWORDS[category];
    if (keywords.some(keyword => normalized.includes(keyword))) {
      addToCache(statusCategoryCache, status, category);
      return category;
    }
  }

  // Default to not-started
  addToCache(statusCategoryCache, status, 'not-started');
  return 'not-started';
}

// Get colors for any status (dynamic)
export function getStatusColors(status: string): StatusColorSet {
  // Check cache first (using LRU get to update access time)
  const cached = getFromCache(statusColorCache, status);
  if (cached) {
    return cached;
  }

  // Try to categorize and use category colors
  const category = getStatusCategory(status);
  const colors = statusCategoryColors[category];

  // Cache and return (with size limit)
  addToCache(statusColorCache, status, colors);
  return colors;
}

// Type colors
export const typeColors: Record<
  ItemType,
  { bg: string; text: string; border: string; icon: string }
> = {
  mission: {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-300',
    icon: 'text-violet-600',
  },
  problem: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: 'text-red-600',
  },
  solution: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'text-blue-600',
  },
  design: {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-300',
    icon: 'text-fuchsia-600',
  },
  project: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    icon: 'text-cyan-600',
  },
};

// Priority colors
export const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  P0: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-400',
  },
  P1: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-400',
  },
  P2: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-400',
  },
  P3: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
};

// Get type label
export const typeLabels: Record<ItemType, string> = {
  mission: 'Mission',
  problem: 'Problem',
  solution: 'Solution',
  design: 'Design',
  project: 'Project',
};

// Get priority label
export const priorityLabels: Record<Priority, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

// Progress bar color based on completion
export const getProgressColor = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-amber-500';
  return 'bg-slate-400';
};

export const typeHexColors: Record<ItemType, string> = {
  mission: '#7c3aed',
  problem: '#dc2626',
  solution: '#2563eb',
  design: '#d946ef',
  project: '#0891b2',
};

/**
 * Extracts unique status values from items, preserving order of first occurrence.
 *
 * This is a common pattern used across views (Kanban, Stats, Filters) to get
 * a consistent list of status columns/categories from the data.
 *
 * @param items - Iterable of objects with a `status` property
 * @returns Array of unique status strings in order of first occurrence
 *
 * @example
 * const items = [{ status: 'In Progress' }, { status: 'Done' }, { status: 'In Progress' }];
 * getUniqueStatuses(items); // ['In Progress', 'Done']
 */
export function getUniqueStatuses<T extends { status: string }>(items: Iterable<T>): string[] {
  const statusSet = new Set<string>();
  const statusOrder: string[] = [];

  for (const item of items) {
    if (!statusSet.has(item.status)) {
      statusSet.add(item.status);
      statusOrder.push(item.status);
    }
  }

  return statusOrder;
}
