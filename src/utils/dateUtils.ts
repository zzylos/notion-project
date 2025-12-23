import { getStatusCategory } from './colors';

/**
 * Safely parse a date string into a Date object.
 * Returns null if the date string is invalid or cannot be parsed.
 *
 * @param dateString - The date string to parse
 * @returns A valid Date object or null if parsing fails
 *
 * @example
 * parseDate('2024-01-15')  // Returns Date object
 * parseDate('invalid')     // Returns null
 * parseDate('')            // Returns null
 */
export function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    // Check if the date is valid (getTime() returns NaN for invalid dates)
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if a due date is overdue (past current date and not completed).
 * Uses safe date parsing to handle invalid date strings.
 */
export function isOverdue(dueDate: string | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (getStatusCategory(status) === 'completed') return false;
  const parsedDate = parseDate(dueDate);
  if (!parsedDate) return false;
  return parsedDate < new Date();
}

/**
 * Format a date for display using consistent formatting.
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const optionsMap: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };

  return dateObj.toLocaleDateString('en-US', optionsMap[format]);
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 days").
 */
export function getRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
