import { getStatusCategory } from './colors';

/**
 * Check if a due date is overdue (past current date and not completed).
 */
export function isOverdue(dueDate: string | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (getStatusCategory(status) === 'completed') return false;
  return new Date(dueDate) < new Date();
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
