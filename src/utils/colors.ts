import type { ItemType, Priority, StatusCategory } from '../types';

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
  'blocked': {
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
  'completed': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
};

// Maximum cache size to prevent memory leaks in long-running sessions
const MAX_CACHE_SIZE = 1000;

// Cache for consistent color assignment
const statusColorCache = new Map<string, StatusColorSet>();

// Cache for status category lookups (performance optimization)
const statusCategoryCache = new Map<string, StatusCategory>();

// Helper to add to cache with size limit
function addToCache<K, V>(cache: Map<K, V>, key: K, value: V): void {
  // If cache is at max size, remove oldest entries (first 10%)
  if (cache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(cache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.1));
    keysToDelete.forEach(k => cache.delete(k));
  }
  cache.set(key, value);
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
  'completed': [
    'done', 'complete', 'finish', 'closed', 'resolved',
    'shipped', 'deployed', 'live', 'released', 'launched',
  ],
  'blocked': [
    'block', 'hold', 'wait', 'stuck', 'pause',
    'duplicate', 'wontfix', 'cancelled', 'canceled',
  ],
  'in-review': [
    'review', 'test', 'qa', 'verif', 'post mortem',
    'postmortem', 'staging', 'approval',
  ],
  'in-progress': [
    'progress', 'doing', 'active', 'wip', 'working',
    'develop', 'solutioning', 'priorit', 'schedul',
    'analysis', 'research', 'project in', 'implementation',
    'coding', 'building',
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
  // Check cache first
  const cached = statusCategoryCache.get(status);
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
  // Check cache first
  const cached = statusColorCache.get(status);
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

// Legacy export for backwards compatibility
export const statusColors = statusCategoryColors;

// Type colors
export const typeColors: Record<ItemType, { bg: string; text: string; border: string; icon: string }> = {
  'mission': {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-300',
    icon: 'text-violet-600',
  },
  'problem': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: 'text-red-600',
  },
  'solution': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'text-blue-600',
  },
  'design': {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-300',
    icon: 'text-fuchsia-600',
  },
  'project': {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    icon: 'text-cyan-600',
  },
};

// Priority colors
export const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  'P0': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-400',
  },
  'P1': {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-400',
  },
  'P2': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-400',
  },
  'P3': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
};

// Get status label - for dynamic statuses, just return the status itself
export function getStatusLabel(status: string): string {
  return status;
}

// Get type label
export const typeLabels: Record<ItemType, string> = {
  'mission': 'Mission',
  'problem': 'Problem',
  'solution': 'Solution',
  'design': 'Design',
  'project': 'Project',
};

// Get priority label
export const priorityLabels: Record<Priority, string> = {
  'P0': 'Critical',
  'P1': 'High',
  'P2': 'Medium',
  'P3': 'Low',
};

// Progress bar color based on completion
export const getProgressColor = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-amber-500';
  return 'bg-slate-400';
};

// SVG colors for tree lines (hex values) by category
const statusCategoryHexColors: Record<StatusCategory, string> = {
  'not-started': '#94a3b8',
  'in-progress': '#3b82f6',
  'blocked': '#ef4444',
  'in-review': '#f59e0b',
  'completed': '#22c55e',
};

// Get hex color for any status
export function getStatusHexColor(status: string): string {
  const category = getStatusCategory(status);
  return statusCategoryHexColors[category];
}

export const typeHexColors: Record<ItemType, string> = {
  'mission': '#7c3aed',
  'problem': '#dc2626',
  'solution': '#2563eb',
  'design': '#d946ef',
  'project': '#0891b2',
};
