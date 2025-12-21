# CLAUDE.md - Project Context for AI Assistants

## Project Overview

This is a Notion Opportunity Tree Visualizer for HouseSigma. It displays work items (missions, problems, solutions, designs, projects) in a hierarchical tree structure, integrated with Notion as the data source.

## Quick Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # TypeScript check + production build
npm run lint         # Run ESLint
npm run test:notion <API_KEY> <DATABASE_ID>  # Test Notion API connection
```

## Architecture

### State Management
- **Zustand** store at `src/store/useStore.ts`
- Key state: `items`, `filters`, `expandedIds`, `selectedItemId`, `viewMode`, `notionConfig`
- Computed: `getFilteredItems()`, `getTreeNodes()`

### View Modes
All view components are in `src/App.tsx` except Tree and Canvas:
- **Tree View** (`src/components/tree/TreeView.tsx`) - Default hierarchical view
- **Canvas View** (`src/components/canvas/CanvasView.tsx`) - Node-based visualization with @xyflow/react
- **Kanban View** - Board by status columns (inline in App.tsx)
- **List View** - Virtualized table with @tanstack/react-virtual (inline in App.tsx)
- **Timeline View** - Chronological view by due date (inline in App.tsx)

### Notion Integration
- Service at `src/services/notionService.ts`
- Uses CORS proxy (`corsproxy.io`) for browser-based API calls
- 5-minute caching to reduce API calls
- Progressive loading with callback for large databases

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app, view switching, Kanban/List/Timeline views |
| `src/store/useStore.ts` | Zustand state management |
| `src/services/notionService.ts` | Notion API integration with caching |
| `src/components/canvas/CanvasView.tsx` | React Flow canvas with hierarchical layout |
| `src/components/canvas/CanvasNode.tsx` | Custom node component for canvas |
| `src/components/tree/TreeView.tsx` | Tree view with expand/collapse |
| `src/components/tree/TreeNode.tsx` | Individual tree node component |
| `src/components/common/DetailPanel.tsx` | Selected item details sidebar |
| `src/components/filters/FilterPanel.tsx` | Filter controls |
| `src/types/index.ts` | TypeScript type definitions |
| `src/utils/colors.ts` | Color utilities for status/type |
| `src/utils/sampleData.ts` | Demo data for offline use |

## Important Patterns

### Canvas View - Avoiding Infinite Loops
The canvas uses `useNodesState` and `useEdgesState` from React Flow. To avoid infinite update loops when data changes:
```typescript
const prevDataRef = useRef<string>('');
// Only update when data actually changes
const dataKey = JSON.stringify(items.map(i => i.id));
if (dataKey !== prevDataRef.current) {
  prevDataRef.current = dataKey;
  // Update nodes/edges
}
```

### Progressive Loading
The Notion service supports progress callbacks:
```typescript
await notionService.fetchAllItems((progress) => {
  // progress.loaded, progress.total, progress.items, progress.done
});
```

### Virtualization for Large Lists
List view uses @tanstack/react-virtual for performance with 1000+ items:
```typescript
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 10,
});
```

## Data Types

### WorkItem (main data type)
```typescript
interface WorkItem {
  id: string;
  title: string;
  type: 'mission' | 'problem' | 'solution' | 'design' | 'project';
  status: 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  parentId?: string;
  owner?: { id: string; name: string; avatar?: string };
  progress?: number;
  dueDate?: string;
  tags?: string[];
  description?: string;
  notionUrl?: string;
}
```

## Known Considerations

1. **CORS Proxy**: The app uses `corsproxy.io` to bypass CORS restrictions when calling Notion API from the browser. This may have rate limits.

2. **Notion API Pagination**: Large databases are fetched in pages of 100. The service handles pagination automatically.

3. **React Flow Provider**: Canvas view must be wrapped in `ReactFlowProvider` for hooks like `useReactFlow` to work.

4. **useMemo Dependencies**: TreeView's `treeNodes` memo depends on `getTreeNodes` function reference from Zustand. Don't add `items` or `filters` directly.

5. **Fullscreen API**: Canvas fullscreen uses browser's native Fullscreen API with `document.fullscreenElement` checks.

## Notion Database Schema

Expected properties (configurable in app settings):
- Name (title) - Work item title
- Type (select) - mission, problem, solution, design, project
- Status (select) - not-started, in-progress, blocked, in-review, completed
- Priority (select) - P0, P1, P2, P3
- Owner (people) - Assigned person
- Parent (relation) - Parent work item
- Progress (number) - 0-100
- Due Date (date) - Target completion
- Tags (multi-select) - Categorization

## Testing Notion Connection

Before integrating, test credentials with:
```bash
npm run test:notion secret_xxx abc123
```

This validates:
1. API key is valid (401 = invalid)
2. Database is accessible (404 = not shared with integration)
3. Query works (returns sample items)

## Build & Lint

Always run before committing:
```bash
npm run build   # Catches TypeScript errors
npm run lint    # Catches ESLint issues
```

Common lint fixes:
- Remove unused variables (prefix with `_` if intentionally unused)
- Fix useMemo/useCallback dependencies
- Remove unused imports
