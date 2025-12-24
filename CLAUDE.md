# CLAUDE.md - Project Context for AI Assistants

## Project Overview

This is a Notion Opportunity Tree Visualizer for HouseSigma. It displays work items (objectives, problems, solutions, projects, deliverables) in a hierarchical tree structure, integrated with Notion as the data source.

## Quick Commands

```bash
npm run dev          # Start development server (Vite)
npm run dev:server   # Start backend API server
npm run dev:full     # Start both frontend and backend concurrently
npm run build        # TypeScript check + production build
npm run build:all    # Build frontend and backend
npm run lint         # Run ESLint
npm run test:notion <API_KEY> <DATABASE_ID>  # Test Notion API connection
```

## Configuration

The app supports configuration through environment variables (`.env` file) or through the UI settings modal. Environment variables take precedence.

### Quick Setup with .env

1. Copy `.env.example` to `.env`
2. Fill in your Notion API key and database IDs
3. Run `npm run dev`

### Environment Variables

```bash
# Required
VITE_NOTION_API_KEY=secret_xxx          # Your Notion API key

# At least one database ID required
VITE_NOTION_DB_MISSION=xxx              # Objectives database
VITE_NOTION_DB_PROBLEM=xxx              # Problems database
VITE_NOTION_DB_SOLUTION=xxx             # Solutions database
VITE_NOTION_DB_PROJECT=xxx              # Projects database
VITE_NOTION_DB_DESIGN=xxx               # Deliverables database

# Optional property mappings (defaults shown)
VITE_MAPPING_TITLE=Name
VITE_MAPPING_STATUS=Status
VITE_MAPPING_PRIORITY=Priority
VITE_MAPPING_OWNER=Owner
VITE_MAPPING_PARENT=Parent
VITE_MAPPING_PROGRESS=Progress
VITE_MAPPING_DUE_DATE=Deadline
VITE_MAPPING_TAGS=Tags

# Optional CORS proxy override
VITE_CORS_PROXY=https://corsproxy.io/?

# Production settings (optional)
VITE_DISABLE_CONFIG_UI=true             # Disable UI configuration (use .env only)
VITE_REFRESH_COOLDOWN_MINUTES=2         # Rate limit refresh button (default: 2 min)
```

The config loader (`src/utils/config.ts`) merges env config with localStorage settings. When using env config, a green indicator appears below the header.

### Production Settings

For production deployments, the following settings are available:

| Variable                        | Default | Description                                                                                                                                                                                |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_DISABLE_CONFIG_UI`        | `false` | When `true`, disables UI-based configuration. Users cannot modify API keys, database IDs, or property mappings through the settings modal. All configuration must be done via `.env` file. |
| `VITE_REFRESH_COOLDOWN_MINUTES` | `2`     | Minimum time between data refreshes to prevent excessive API calls. Set to `0` to disable rate limiting.                                                                                   |

When `VITE_DISABLE_CONFIG_UI=true`:

- Settings modal shows a locked configuration banner
- API key, database ID, and property mapping inputs are hidden
- Disconnect and demo data options are hidden
- Only performance settings remain editable

When refresh cooldown is active:

- Refresh button shows remaining countdown time
- Button is disabled until cooldown expires
- Cooldown persists across page reloads

### Backend API Mode (Recommended for Production)

For production deployments, use the backend API mode instead of direct browser-to-Notion calls:

```bash
# Frontend .env
VITE_USE_BACKEND_API=true
VITE_API_URL=http://localhost:3001  # Or your production backend URL

# Backend server/.env
NOTION_API_KEY=secret_xxx
NOTION_DB_MISSION=xxx
# ... other database IDs
```

**Benefits:**

- API key stays on the server (more secure)
- Server-side caching with configurable TTL
- No CORS proxy needed
- Better rate limiting control

**Architecture:**

```
Browser → Backend API Server → Notion API
              ↓
         Server Cache
         (node-cache)
```

**Backend API Endpoints:**

| Endpoint                  | Method | Description              |
| ------------------------- | ------ | ------------------------ |
| `/api/items`              | GET    | Fetch all items (cached) |
| `/api/items/:id`          | GET    | Fetch single item        |
| `/api/items/:id/status`   | PATCH  | Update item status       |
| `/api/items/:id/progress` | PATCH  | Update item progress     |
| `/api/cache/invalidate`   | POST   | Clear server cache       |
| `/api/cache/stats`        | GET    | Get cache statistics     |
| `/api/health`             | GET    | Health check             |

## Architecture

### State Management

- **Zustand** store at `src/store/useStore.ts`
- Key state: `items`, `filters`, `expandedIds`, `selectedItemId`, `viewMode`, `notionConfig`
- Computed: `getFilteredItems()`, `getTreeNodes()`

### View Modes

- **Tree View** (`src/components/tree/TreeView.tsx`) - Default hierarchical view
- **Canvas View** (`src/components/canvas/CanvasView.tsx`) - Node-based visualization with @xyflow/react
- **Kanban View** (`src/components/views/KanbanView.tsx`) - Board by dynamic status columns
- **List View** (`src/components/views/ListView.tsx`) - Virtualized table with @tanstack/react-virtual
- **Timeline View** (`src/components/views/TimelineView.tsx`) - Chronological view by due date

### Notion Integration

- Service at `src/services/notionService.ts`
- API client at `src/services/apiClient.ts` (for backend mode)
- **Multi-database support**: Fetches from up to 5 databases (Objectives, Problems, Solutions, Projects, Deliverables)
- **Two operation modes**:
  - **Direct mode** (default): Uses CORS proxy (`corsproxy.io`) for browser-based API calls
  - **Backend mode** (`VITE_USE_BACKEND_API=true`): Calls your own backend server
- **Dual-layer caching** (both modes):
  - Memory cache (5 minutes) - for quick navigation
  - Persistent localStorage cache (24 hours) - survives page reloads for faster startup
- **Server-side caching** (backend mode only):
  - Configurable TTL (default: 5 minutes)
  - Cache invalidation via API
- Progressive loading with callback for large databases
- Type is determined by which database an item comes from

## Key Files

| File                                          | Purpose                                     |
| --------------------------------------------- | ------------------------------------------- |
| `src/App.tsx`                                 | Main app, view switching, collapsible stats |
| `src/store/useStore.ts`                       | Zustand state management                    |
| `src/services/notionService.ts`               | Multi-database Notion API integration       |
| `src/services/apiClient.ts`                   | Backend API client (for backend mode)       |
| `src/components/common/NotionConfigModal.tsx` | Settings with multi-database inputs         |
| `src/components/canvas/CanvasView.tsx`        | React Flow canvas with hierarchical layout  |
| `src/components/canvas/CanvasNode.tsx`        | Custom node component for canvas            |
| `src/components/tree/TreeView.tsx`            | Tree view with expand/collapse              |
| `src/components/tree/TreeNode.tsx`            | Individual tree node component              |
| `src/components/views/KanbanView.tsx`         | Dynamic status columns from data            |
| `src/components/views/ListView.tsx`           | Virtualized list view                       |
| `src/components/views/TimelineView.tsx`       | Timeline view                               |
| `src/components/common/DetailPanel.tsx`       | Selected item details sidebar               |
| `src/components/common/StatsOverview.tsx`     | Collapsible statistics panel                |
| `src/components/filters/FilterPanel.tsx`      | Dynamic filter controls                     |
| `src/types/index.ts`                          | TypeScript type definitions                 |
| `src/utils/colors.ts`                         | Color utilities with dynamic status support |
| `src/utils/sampleData.ts`                     | Demo data for offline use                   |
| `server/src/index.ts`                         | Backend API server entry point              |
| `server/src/services/notion.ts`               | Server-side Notion API service              |
| `server/src/services/cache.ts`                | Server-side caching service                 |
| `server/src/routes/items.ts`                  | Items API endpoints                         |
| `server/src/routes/cache.ts`                  | Cache management endpoints                  |

## Important Patterns

### Multi-Database Configuration

The app supports multiple Notion databases, each mapped to a specific item type:

```typescript
interface NotionConfig {
  apiKey: string;
  databases: DatabaseConfig[]; // Array of {databaseId, type}
  defaultMappings: PropertyMappings;
}
```

Database types:

- `mission` → Objectives database
- `problem` → Problems database
- `solution` → Solutions database
- `project` → Projects database
- `design` → Deliverables database

### Dynamic Status Labels

Status is now a string type (not a union) to preserve original Notion values:

```typescript
type ItemStatus = string; // Preserves "Analysis/Research", "Solutioning", etc.
type StatusCategory = 'not-started' | 'in-progress' | 'blocked' | 'in-review' | 'completed';

// Get color category from any status string
const category = getStatusCategory(item.status);
const colors = getStatusColors(item.status);
```

### Canvas View - Avoiding Infinite Loops

The canvas uses `useNodesState` and `useEdgesState` from React Flow. To avoid infinite update loops when data changes:

```typescript
const prevDataRef = useRef<string>('');
const dataKey = JSON.stringify(items.map(i => i.id));
if (dataKey !== prevDataRef.current) {
  prevDataRef.current = dataKey;
  // Update nodes/edges
}
```

### Progressive Loading

The Notion service supports progress callbacks:

```typescript
await notionService.fetchAllItems(progress => {
  // progress.loaded, progress.total, progress.items, progress.done, progress.currentDatabase
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
  status: string; // Dynamic - preserves original Notion status
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

### NotionConfig

```typescript
interface NotionConfig {
  apiKey: string;
  databases: DatabaseConfig[]; // Multiple databases
  defaultMappings: PropertyMappings;
  // Legacy support
  databaseId?: string;
  mappings?: PropertyMappings & { type: string };
}

interface DatabaseConfig {
  databaseId: string;
  type: ItemType;
  mappings?: Partial<PropertyMappings>; // Optional per-database overrides
}
```

## Known Considerations

1. **Multi-Database Fetching**: Items from each database are fetched sequentially, then merged. Parent relations work across databases.

2. **CORS Proxy**: The app uses `corsproxy.io` to bypass CORS restrictions when calling Notion API from the browser. This may have rate limits.

3. **Notion API Pagination**: Large databases are fetched in pages of 100. The service handles pagination automatically.

4. **React Flow Provider**: Canvas view must be wrapped in `ReactFlowProvider` for hooks like `useReactFlow` to work.

5. **useMemo Dependencies**: TreeView's `treeNodes` memo depends on `getTreeNodes` function reference from Zustand. Don't add `items` or `filters` directly.

6. **Fullscreen API**: Canvas fullscreen uses browser's native Fullscreen API with `document.fullscreenElement` checks.

7. **Status Color Mapping**: Use `getStatusCategory()` and `getStatusColors()` from `src/utils/colors.ts` for consistent color handling.

## Notion Database Schema

Each database should have these properties (configurable in app settings):

- Name (title) - Work item title
- Status (select/status) - Your custom status labels (preserved as-is)
- Priority (select) - P0, P1, P2, P3 (or High, Medium, Low variants)
- Owner (people) - Assigned person
- Parent (relation) - Parent work item (can link across databases)
- Progress (number) - 0-100
- Due Date (date) - Target completion
- Tags (multi-select) - Categorization

**Note**: Type property is NOT needed - type is determined by which database the item comes from.

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

## Debug Mode

In development mode, the app logs helpful debug info to the console:

- Property names detected from each database
- Warnings when Type or Parent properties are not found
- Which database is currently being fetched
