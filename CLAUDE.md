# CLAUDE.md - Project Context for AI Assistants

## Project Overview

This is a Notion Opportunity Tree Visualizer for HouseSigma. It displays work items (objectives, problems, solutions, projects, deliverables) in a hierarchical tree structure, integrated with Notion as the data source.

## Quick Commands

```bash
# Development
npm run dev          # Start development server (Vite)
npm run dev:server   # Start backend API server
npm run dev:full     # Start both frontend and backend concurrently

# Building
npm run build        # TypeScript check + production build
npm run build:all    # Build frontend and backend
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run typecheck    # Run TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:ui      # Run tests with Vitest UI

# Utilities
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
# Root .env (used by both frontend and backend)
VITE_USE_BACKEND_API=true
VITE_API_URL=http://localhost:3001  # Or your production backend URL

# Notion credentials (shared by frontend and backend)
# Backend reads both VITE_* and non-prefixed versions
VITE_NOTION_API_KEY=secret_xxx
VITE_NOTION_DB_MISSION=xxx
VITE_NOTION_DB_PROBLEM=xxx
VITE_NOTION_DB_SOLUTION=xxx
VITE_NOTION_DB_PROJECT=xxx
VITE_NOTION_DB_DESIGN=xxx

# Property mappings (optional)
VITE_MAPPING_TITLE=Name
VITE_MAPPING_STATUS=Status
# ... other mappings

# Backend-specific settings
PORT=3001                           # Server port (default: 3001)
CORS_ORIGIN=http://localhost:5173   # Frontend URL for CORS
NOTION_WEBHOOK_SECRET=secret_xxx    # Webhook verification token (from Notion)
```

**Note:** The backend server reads the root `.env` file (not `server/.env`). It supports both `VITE_*` prefixed variables (for sharing with frontend) and non-prefixed versions.

**Benefits:**

- API key stays on the server (more secure)
- Real-time updates via Notion webhooks
- No CORS proxy needed
- Data synced automatically when pages change in Notion

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVER STARTUP                          │
│  Fetch all items from all databases (once)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA STORE                            │
│  Persistent in-memory Map (no TTL, updated via webhooks)    │
└─────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
    ┌──────────┐                    ┌─────────────────────┐
    │ GET /api │                    │ POST /api/webhook   │
    │  /items  │                    │  (from Notion)      │
    └──────────┘                    └─────────────────────┘
```

**Webhook-Based Real-Time Updates:**

The server uses Notion Integration Webhooks for real-time data synchronization:

1. On startup, fetches all items from all configured databases once
2. Stores items in persistent in-memory DataStore (no expiration)
3. Receives webhook events from Notion when pages change
4. Updates local store immediately upon webhook events

**Handled Webhook Events:**

| Event Type                | Action                         |
| ------------------------- | ------------------------------ |
| `page.content_updated`    | Refetch page, update store     |
| `page.created`            | Fetch new page, add to store   |
| `page.deleted`            | Remove from store              |
| `page.moved`              | Refetch to get new parent      |
| `page.undeleted`          | Refetch and add back to store  |
| `page.unlocked`           | Refetch and update store       |
| `database.schema_updated` | Logged (manual sync if needed) |

**Backend API Endpoints:**

| Endpoint                  | Method | Description                          |
| ------------------------- | ------ | ------------------------------------ |
| `/api/items`              | GET    | Fetch all items from in-memory store |
| `/api/items/sync`         | POST   | Force full re-sync from Notion       |
| `/api/items/:id`          | GET    | Fetch single item from store         |
| `/api/items/:id/status`   | PATCH  | Update item status                   |
| `/api/items/:id/progress` | PATCH  | Update item progress                 |
| `/api/webhook`            | POST   | Receive Notion webhook events        |
| `/api/webhook/status`     | GET    | Check webhook configuration status   |
| `/api/webhook/set-token`  | POST   | Manually set verification token      |
| `/api/store/stats`        | GET    | Get store statistics                 |
| `/api/health`             | GET    | Health check                         |

**Rate Limiting:**

| Endpoint                  | Limit     | Description                          |
| ------------------------- | --------- | ------------------------------------ |
| `GET /api/items`          | 60/min    | Read operations                      |
| `PATCH /api/items/:id/*`  | 20/min    | Mutation operations (status/progress)|

### Webhook Setup

To enable real-time updates from Notion:

1. **Create webhook subscription** in your [Notion integration settings](https://www.notion.so/profile/integrations):
   - Navigate to your integration → **Webhooks** tab
   - Click **+ Create subscription**
   - Enter your webhook URL: `https://your-server.com/api/webhook`
   - Subscribe to events: `page.content_updated`, `page.created`, `page.deleted`, `page.moved`

2. **Receive verification token**: When you create the subscription, Notion sends a POST request to your webhook URL containing a `verification_token`. Check your server logs:

   ```
   [Webhook] NOTION_WEBHOOK_SECRET=secret_xxxxx
   ```

3. **Configure environment**: Add the token to your `.env` file:

   ```bash
   NOTION_WEBHOOK_SECRET=secret_xxxxx
   ```

4. **Verify in Notion UI**: Paste the token in the Notion verification modal to activate the subscription.

**Webhook Payload Validation:**

The server validates webhook signatures using HMAC-SHA256:

- Notion includes `X-Notion-Signature` header with each request
- Server computes expected signature using `NOTION_WEBHOOK_SECRET`
- Requests with invalid signatures are rejected (401)

**Note:** If `NOTION_WEBHOOK_SECRET` is not configured, signature validation is skipped (useful for initial setup).

## Architecture

### State Management

- **Zustand** store at `src/store/useStore.ts`
- Key state: `items`, `filters`, `expandedIds`, `selectedItemId`, `viewMode`, `notionConfig`, `hideOrphanItems`, `disableItemLimit`
- Computed: `getFilteredItems()`, `getTreeNodes()`, `getStats()`, `getItemPath()`
- Tree building delegated to `src/utils/treeBuilder.ts` for better modularity

### View Modes

- **Tree View** (`src/components/tree/TreeView.tsx`) - Default hierarchical view
- **Canvas View** (`src/components/canvas/CanvasView.tsx`) - Node-based visualization with @xyflow/react
- **Kanban View** (`src/components/views/KanbanView.tsx`) - Board by dynamic status columns
- **List View** (`src/components/views/ListView.tsx`) - Virtualized table with @tanstack/react-virtual
- **Timeline View** (`src/components/views/TimelineView.tsx`) - Chronological view by due date

### Custom Hooks

The `src/hooks/` directory contains reusable hooks:

- `useNotionData.ts` - Data fetching orchestration with progress tracking
- `useCooldownTimer.ts` - Refresh rate limiting with countdown
- `useFilterToggle.ts` - Filter state management helpers
- `useFullscreen.ts` - Fullscreen API integration for canvas view
- `useItemLimit.ts` - Item limit management for performance
- `useStoreSelectors.ts` - Optimized Zustand selectors (useFilteredItems, useTreeNodes, useStats, etc.)
- `useFetch.ts` - Generic fetch hook with abort support
- `useLocalStorage.ts` - Persistent localStorage hook

### Shared Code

The `shared/` directory contains code shared between frontend and backend:

- `shared/types.ts` - Core types (WorkItem, NotionConfig, etc.) - single source of truth
- `shared/constants.ts` - Shared constants (PROPERTY_ALIASES, DEFAULT_PROPERTY_MAPPINGS, NOTION_API)
- `shared/index.ts` - Exports for both client and server

### Notion Integration

- Service at `src/services/notionService.ts`
- Modular service components in `src/services/notion/`:
  - `NotionCacheManager.ts` - Client-side caching logic
  - `NotionDataTransformer.ts` - Data transformation from Notion format
  - `NotionPropertyMapper.ts` - Property mapping and alias resolution
- API client at `src/services/apiClient.ts` (for backend mode)
- **Multi-database support**: Fetches from up to 5 databases (Objectives, Problems, Solutions, Projects, Deliverables)
- **Two operation modes**:
  - **Direct mode** (default): Uses CORS proxy (`corsproxy.io`) for browser-based API calls
  - **Backend mode** (`VITE_USE_BACKEND_API=true`): Calls your own backend server with webhook support
- **Client-side caching** (direct mode):
  - Memory cache (5 minutes) - for quick navigation
  - Persistent localStorage cache (24 hours) - survives page reloads for faster startup
- **Server-side data store** (backend mode):
  - Persistent in-memory store (no expiration)
  - Real-time updates via Notion webhooks
  - Full re-sync available via `/api/items/sync`
- Progressive loading with callback for large databases
- Type is determined by which database an item comes from

## Key Files

### Core Application

| File                    | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `src/App.tsx`           | Main app, view switching, collapsible stats |
| `src/main.tsx`          | Vite entry point                            |
| `src/constants.ts`      | Application-wide constants                  |
| `src/store/useStore.ts` | Zustand state management                    |
| `src/types/index.ts`    | TypeScript type definitions (re-exports)    |
| `src/types/notion.ts`   | Notion API-specific types                   |

### Shared (Client/Server)

| File                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `shared/types.ts`     | Core types (WorkItem, NotionConfig) - single source of truth   |
| `shared/constants.ts` | Shared constants (PROPERTY_ALIASES, DEFAULT_PROPERTY_MAPPINGS) |

### Services

| File                                           | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `src/services/notionService.ts`                | Multi-database Notion API integration |
| `src/services/apiClient.ts`                    | Backend API client (for backend mode) |
| `src/services/notion/NotionCacheManager.ts`    | Client-side caching logic             |
| `src/services/notion/NotionDataTransformer.ts` | Data transformation from Notion       |
| `src/services/notion/NotionPropertyMapper.ts`  | Property mapping and alias resolution |

### Hooks

| File                             | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `src/hooks/useNotionData.ts`     | Data fetching orchestration with progress |
| `src/hooks/useCooldownTimer.ts`  | Refresh rate limiting with countdown      |
| `src/hooks/useFilterToggle.ts`   | Filter state management helpers           |
| `src/hooks/useItemLimit.ts`      | Item limit management for performance     |
| `src/hooks/useStoreSelectors.ts` | Optimized Zustand selectors               |
| `src/hooks/useFetch.ts`          | Generic fetch hook with abort support     |
| `src/hooks/useLocalStorage.ts`   | Persistent localStorage hook              |
| `src/hooks/useFullscreen.ts`     | Fullscreen API integration                |

### Components

| File                                          | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `src/components/common/NotionConfigModal.tsx` | Settings with multi-database inputs        |
| `src/components/common/DetailPanel.tsx`       | Selected item details sidebar              |
| `src/components/common/StatsOverview.tsx`     | Collapsible statistics panel               |
| `src/components/common/Header.tsx`            | App header with controls                   |
| `src/components/common/ErrorBoundary.tsx`     | Error boundary wrapper                     |
| `src/components/canvas/CanvasView.tsx`        | React Flow canvas with hierarchical layout |
| `src/components/canvas/CanvasNode.tsx`        | Custom node component for canvas           |
| `src/components/canvas/CanvasControls.tsx`    | Canvas control toolbar                     |
| `src/components/tree/TreeView.tsx`            | Tree view with expand/collapse             |
| `src/components/tree/TreeNode.tsx`            | Individual tree node component             |
| `src/components/views/KanbanView.tsx`         | Dynamic status columns from data           |
| `src/components/views/ListView.tsx`           | Virtualized list view                      |
| `src/components/views/TimelineView.tsx`       | Timeline view                              |
| `src/components/filters/FilterPanel.tsx`      | Dynamic filter controls                    |

### Utilities

| File                            | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `src/utils/colors.ts`           | Color utilities with dynamic status support |
| `src/utils/config.ts`           | Configuration loading and merging           |
| `src/utils/errors.ts`           | Error classes and error handling utilities  |
| `src/utils/logger.ts`           | Unified logging utility                     |
| `src/utils/typeGuards.ts`       | Type guard utilities for runtime checks     |
| `src/utils/validation.ts`       | Input validation utilities                  |
| `src/utils/sampleData.ts`       | Demo data for offline use                   |
| `src/utils/treeBuilder.ts`      | Tree building and path utilities            |
| `src/utils/layoutCalculator.ts` | Canvas layout calculations                  |
| `src/utils/dateUtils.ts`        | Date parsing and formatting                 |
| `src/utils/arrayUtils.ts`       | Array manipulation helpers                  |
| `src/utils/icons.ts`            | Icon utilities for item types               |

### Backend Server

| File                                 | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `server/src/index.ts`                | Backend API server entry point  |
| `server/src/config.ts`               | Server configuration loading    |
| `server/src/services/notion.ts`      | Server-side Notion API service  |
| `server/src/services/dataStore.ts`   | Persistent in-memory data store |
| `server/src/routes/items.ts`         | Items API endpoints             |
| `server/src/routes/webhook.ts`       | Notion webhook endpoint         |
| `server/src/middleware/rateLimit.ts` | Rate limiting middleware        |
| `server/src/utils/logger.ts`         | Server logging utility          |
| `server/src/utils/uuid.ts`           | UUID normalization utility      |

### Testing

| File                                    | Purpose                         |
| --------------------------------------- | ------------------------------- |
| `src/test/setup.ts`                     | Vitest test setup and mocks     |
| `vitest.config.ts`                      | Vitest configuration (frontend) |
| `server/vitest.config.ts`               | Vitest configuration (backend)  |
| `server/src/services/dataStore.test.ts` | DataStore service tests         |
| `server/src/routes/webhook.test.ts`     | Webhook route tests             |

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

Types are defined in `shared/types.ts` (single source of truth) and re-exported from `src/types/index.ts`.

### WorkItem (main data type)

```typescript
interface WorkItem {
  id: string;
  title: string;
  type: 'mission' | 'problem' | 'solution' | 'design' | 'project';
  status: string; // Dynamic - preserves original Notion status
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  progress?: number;
  owner?: Owner;
  assignees?: Owner[]; // Multiple assignees support
  parentId?: string;
  children?: string[]; // Child item IDs
  description?: string;
  dueDate?: string;
  createdAt: string; // Required - from Notion
  updatedAt: string; // Required - from Notion
  notionPageId?: string;
  notionUrl?: string;
  tags?: string[];
  dependencies?: string[]; // Dependency item IDs
  blockedBy?: string[]; // Blocker item IDs
}

interface Owner {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}
```

### NotionConfig

```typescript
interface NotionConfig {
  apiKey: string;
  databases: DatabaseConfig[]; // Multiple databases
  defaultMappings: PropertyMappings;
  // Legacy support (deprecated)
  databaseId?: string;
  mappings?: PropertyMappings & { type: string };
}

interface DatabaseConfig {
  databaseId: string;
  type: ItemType;
  mappings?: Partial<PropertyMappings>; // Optional per-database overrides
}

interface PropertyMappings {
  title: string;
  status: string;
  priority: string;
  owner: string;
  parent: string;
  progress: string;
  dueDate: string;
  tags: string;
}
```

## Known Considerations

1. **Multi-Database Fetching**: Items from each database are fetched in parallel, then merged. Parent relations work across databases.

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

## Testing

The project uses Vitest with React Testing Library for testing.

### Running Tests

```bash
npm run test          # Watch mode - re-runs on file changes
npm run test:run      # Single run - useful for CI
npm run test:coverage # Generate coverage report
npm run test:ui       # Visual test runner UI
```

### Test Structure

Tests are colocated with source files using the `.test.ts` or `.test.tsx` suffix:

```
src/utils/
├── validation.ts
├── validation.test.ts    # Tests for validation.ts
├── typeGuards.ts
├── typeGuards.test.ts    # Tests for typeGuards.ts
└── errors.ts
└── errors.test.ts        # Tests for errors.ts
```

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionToTest } from './module';

describe('functionToTest', () => {
  it('should handle valid input', () => {
    expect(functionToTest('input')).toBe('expected');
  });
});
```

## Build & Lint

Always run before committing:

```bash
npm run build      # Catches TypeScript errors
npm run lint       # Catches ESLint issues
npm run test:run   # Runs all tests
```

Common lint fixes:

- Remove unused variables (prefix with `_` if intentionally unused)
- Fix useMemo/useCallback dependencies
- Remove unused imports
- Reduce function complexity (max 15)

## Debug Mode

In development mode, the app logs helpful debug info to the console:

- Property names detected from each database
- Warnings when Type or Parent properties are not found
- Which database is currently being fetched

## Utility Modules

### Logger (`src/utils/logger.ts`)

Unified logging utility with consistent formatting:

```typescript
import { logger } from './utils/logger';

logger.info('Notion', 'Fetching items...');
logger.warn('Store', 'Cache miss');
logger.error('App', 'Failed to load', error);
logger.table('Debug', items); // Tabular output
```

### Type Guards (`src/utils/typeGuards.ts`)

Type-safe runtime checks:

```typescript
import { isAbortError, isNonEmptyString, getErrorMessage } from './utils/typeGuards';

if (isAbortError(error)) return; // Handle user cancellation
if (isNonEmptyString(value)) {
  /* value is string */
}
const message = getErrorMessage(error, 'Default message');
```

### Error Utilities (`src/utils/errors.ts`)

Custom error classes and error handling:

```typescript
import { ApiError, NetworkError, withRetry, shouldRetry } from './utils/errors';

// Custom error classes
throw new ApiError('Not found', '/api/items', { statusCode: 404 });

// Retry with exponential backoff
const result = await withRetry(() => fetchData(), { maxRetries: 3 });
```

### Constants (`src/constants.ts`)

Application-wide constants organized by category:

- `CANVAS` - Canvas view layout (spacing, node width, tree gap)
- `TREE` - Tree view (max depth, indentation)
- `VIEW_LIMITS` - Item rendering limits for performance
- `NOTION` - API constants (cache timeout, page size, base URL)
- `REFRESH` - Refresh rate limiting (default cooldown, localStorage key)
- `CACHE` - Caching timeouts and keys (persistent timeout, metadata key)
- `EDGE_STYLES` - Canvas edge styling (stroke width, colors)
- `TIMING` - Animation and debounce delays
- `VIEW_MODES` - Available view modes array
- `TYPE_ORDER` / `PRIORITY_ORDER` - Display order for types and priorities
- `DEFAULT_PROPERTY_MAPPINGS` - Default Notion property names
- `PROPERTY_ALIASES` - Alternative property names for flexible matching
- `STATUS_GROUPS` / `STATUS_TO_GROUP` - Status grouping for filters

### Tree Builder (`src/utils/treeBuilder.ts`)

Tree building utilities with safety features:

```typescript
import { buildTreeNodes, getItemPath, buildChildMap } from './utils/treeBuilder';

// Build tree structure from flat items
const nodes = buildTreeNodes(filteredItems, {
  expandedIds: new Set(['id1']),
  selectedItemId: 'id1',
  focusedItemId: null,
});

// Get path from root to item
const path = getItemPath(itemId, itemsMap);

// Pre-compute child map for performance
const childMap = buildChildMap(items);
```

Features:

- Circular reference detection
- Depth limiting (prevents stack overflow)
- Handles orphaned items (parent filtered out)

### Date Utilities (`src/utils/dateUtils.ts`)

Date parsing and formatting:

```typescript
import { parseDate, formatDate, isOverdue, getRelativeTime } from './utils/dateUtils';

const date = parseDate('2024-01-15');
const formatted = formatDate(date); // "Jan 15, 2024"
const overdue = isOverdue('2024-01-01'); // true if past
const relative = getRelativeTime('2024-01-15'); // "in 2 days"
```

### Array Utilities (`src/utils/arrayUtils.ts`)

Array manipulation helpers:

```typescript
import { toggleArrayItem, includesItem, unique } from './utils/arrayUtils';

const newArray = toggleArrayItem(array, item); // Add if missing, remove if present
const hasItem = includesItem(array, item);
const uniqueItems = unique(arrayWithDuplicates);
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, code style, and contribution process.
