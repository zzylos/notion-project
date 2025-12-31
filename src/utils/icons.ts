import { Target, AlertCircle, Lightbulb, Palette, FolderKanban } from 'lucide-react';
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
