// Work item types in the opportunity tree
export type ItemType = 'mission' | 'problem' | 'solution' | 'design' | 'project';

// Status of work items - now dynamic, stores the original Notion status
export type ItemStatus = string;

// Known status categories for color mapping (internal use)
export type StatusCategory = 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed';

// Priority levels
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

// Owner information
export interface Owner {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// A work item in the opportunity tree
export interface WorkItem {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  priority?: Priority;
  progress?: number; // 0-100 percentage
  owner?: Owner;
  assignees?: Owner[];
  parentId?: string;
  children?: string[]; // IDs of child items
  description?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  notionPageId?: string;
  notionUrl?: string;
  tags?: string[];
  // For tracking dependencies
  dependencies?: string[];
  blockedBy?: string[];
}

// Tree node representation for visualization
export interface TreeNode {
  item: WorkItem;
  children: TreeNode[];
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

// Filter state
export interface FilterState {
  types: ItemType[];
  statuses: ItemStatus[];
  priorities: Priority[];
  owners: string[];
  searchQuery: string;
  showOnlyMyItems: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// View mode options
export type ViewMode = 'tree' | 'canvas' | 'kanban' | 'timeline' | 'list';

// Notion database configuration
export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  mappings: {
    title: string;
    type: string;
    status: string;
    priority: string;
    owner: string;
    parent: string;
    progress: string;
    dueDate: string;
    tags: string;
  };
}

// Application state
export interface AppState {
  items: Map<string, WorkItem>;
  treeNodes: TreeNode[];
  selectedItemId: string | null;
  focusedItemId: string | null;
  expandedIds: Set<string>;
  filters: FilterState;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  notionConfig: NotionConfig | null;
}

// Stats for dashboard
export interface DashboardStats {
  totalItems: number;
  byStatus: Record<string, number>;
  byType: Record<ItemType, number>;
  byPriority: Record<Priority, number>;
  completionRate: number;
  overdueItems: number;
  blockedItems: number;
}
