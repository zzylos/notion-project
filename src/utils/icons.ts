import {
  Target,
  AlertCircle,
  Lightbulb,
  Palette,
  FolderKanban,
} from 'lucide-react';
import type { ItemType } from '../types';

/**
 * Icon components for each work item type.
 * Centralized to ensure consistency across all views.
 */
export const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  mission: Target,
  problem: AlertCircle,
  solution: Lightbulb,
  design: Palette,
  project: FolderKanban,
};

/**
 * Get the icon component for a given item type.
 */
export function getTypeIcon(type: ItemType): React.ComponentType<{ className?: string }> {
  return typeIcons[type];
}
