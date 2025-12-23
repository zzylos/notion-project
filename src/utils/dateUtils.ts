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
 * Compares dates at start-of-day to avoid timezone issues where
 * items due "today" incorrectly show as overdue.
 */
export function isOverdue(dueDate: string | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (getStatusCategory(status) === 'completed') return false;
  const parsedDate = parseDate(dueDate);
  if (!parsedDate) return false;

  // Normalize both dates to start-of-day for accurate comparison
  const dueDateStart = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return dueDateStart < todayStart;
}

/**
 * Format a date for display using consistent formatting.
 * Returns empty string if the date is invalid.
 *
 * @param date - The date to format (string or Date object)
 * @param format - The format to use ('short', 'medium', or 'long')
 * @returns Formatted date string, or empty string if date is invalid
 */
export function formatDate(
  date: string | Date | undefined | null,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const optionsMap: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };

  return dateObj.toLocaleDateString('en-US', optionsMap[format]);
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 days").
 * Returns empty string if the date is invalid.
 *
 * @param date - The date to compare (string or Date object)
 * @returns Relative time string, or empty string if date is invalid
 */
export function getRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
