import React from 'react';
import { Inbox, Search, Filter, Database } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'filter' | 'data';

interface EmptyStateProps {
  /** The title to display */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** Variant determines the icon shown */
  variant?: EmptyStateVariant;
  /** Custom icon to override the variant icon */
  icon?: React.ReactNode;
  /** Optional action button or link */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, React.ComponentType<{ className?: string }>> = {
  default: Inbox,
  search: Search,
  filter: Filter,
  data: Database,
};

const variantDefaults: Record<EmptyStateVariant, { title: string; description: string }> = {
  default: {
    title: 'No items',
    description: 'There are no items to display.',
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search terms.',
  },
  filter: {
    title: 'No matching items',
    description: 'Try adjusting your filters to see more items.',
  },
  data: {
    title: 'No data available',
    description: 'Connect to a data source to get started.',
  },
};

/**
 * A standardized empty state component for displaying when there's no content.
 *
 * Provides consistent styling and messaging across the application with
 * pre-defined variants for common scenarios.
 *
 * @example
 * // Basic usage
 * <EmptyState />
 *
 * // With search variant
 * <EmptyState variant="search" />
 *
 * // Custom content
 * <EmptyState
 *   title="No projects yet"
 *   description="Create your first project to get started."
 *   action={<button>Create Project</button>}
 * />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  variant = 'default',
  icon,
  action,
  className = '',
}) => {
  const defaults = variantDefaults[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
      role="status"
      aria-label={title || defaults.title}
    >
      <div className="w-12 h-12 mb-4 text-gray-300">{icon || <Icon className="w-12 h-12" />}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title || defaults.title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description || defaults.description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
