# Implementation Plan: MongoDB Persistence Layer

## Overview

Replace the current in-memory-only data store with a MongoDB Atlas persistence layer, keeping the in-memory store as a read cache. Implement scheduled incremental syncs and full re-pulls to ensure data consistency with Notion.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER STARTUP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Connect to MongoDB Atlas (fail if unavailable)                          │
│  2. Read sync-state.json                                                    │
│  3. If first run: Full Notion pull → MongoDB                                │
│  4. If restart: Incremental pull for downtime → Merge with MongoDB          │
│  5. Load MongoDB data into in-memory cache                                  │
│  6. Start scheduler for periodic syncs                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RUNTIME FLOW                                    │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│   WEBHOOKS (Real-time)│  SCHEDULED SYNCS     │  API REQUESTS                │
│   ──────────────────  │  ────────────────    │  ────────────────            │
│   • Notion events     │  • Every 24h:        │  • Read from cache           │
│   • Update MongoDB    │    Incremental sync  │  • Write to MongoDB          │
│   • Update cache      │    (last 26h filter) │    then cache                │
│   • Handle deletions  │  • Every 7 days:     │                              │
│                       │    Full re-pull      │                              │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    IN-MEMORY CACHE (DataStore)                      │    │
│  │                    Fast reads, volatile                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MONGODB ATLAS (Persistent)                       │    │
│  │                    Source of truth, survives restarts               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. New Files to Create

| File | Purpose |
|------|---------|
| `server/src/services/mongodb.ts` | MongoDB connection and CRUD operations |
| `server/src/services/syncState.ts` | JSON file manager for sync timestamps |
| `server/src/services/scheduler.ts` | In-process scheduled task manager |
| `server/src/services/syncService.ts` | Orchestrates sync operations (full/incremental) |

### 2. Files to Modify

| File | Changes |
|------|---------|
| `server/src/index.ts` | New startup flow, MongoDB init, scheduler init |
| `server/src/config.ts` | Add MongoDB connection string config |
| `server/src/services/dataStore.ts` | Convert to cache layer backed by MongoDB |
| `server/src/services/notion.ts` | Add `fetchItemsSince(timestamp)` method |
| `server/src/routes/webhook.ts` | Write to MongoDB, then update cache |
| `server/src/routes/items.ts` | Ensure writes go to MongoDB first |
| `server/package.json` | Add `mongodb` and `node-cron` dependencies |

### 3. New Configuration

| Environment Variable | Purpose | Example |
|---------------------|---------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/notion-tree` |
| `MONGODB_DB_NAME` | Database name (optional, can be in URI) | `notion-tree` |

---

## Detailed Implementation Steps

### Phase 1: MongoDB Foundation

#### Step 1.1: Add Dependencies
```bash
cd server
npm install mongodb node-cron
npm install -D @types/node-cron
```

#### Step 1.2: Create MongoDB Service (`server/src/services/mongodb.ts`)

**Responsibilities:**
- Singleton pattern for MongoDB client
- Connection management with retry logic
- CRUD operations for items collection
- Proper indexing for query performance

**Schema (items collection):**
```typescript
interface MongoWorkItem extends WorkItem {
  _id: string;  // Use Notion page ID as _id
}
```

**Indexes to create:**
- `{ type: 1 }` - Filter by item type
- `{ parentId: 1 }` - Parent-child queries
- `{ updatedAt: -1 }` - Sort by update time
- `{ "children": 1 }` - Child lookups

**Key Methods:**
```typescript
// Connection
initializeMongoDB(uri: string): Promise<void>
closeMongoDB(): Promise<void>
getMongoDB(): Db

// Items CRUD
getAllItems(): Promise<WorkItem[]>
getItem(id: string): Promise<WorkItem | null>
upsertItem(item: WorkItem): Promise<void>
upsertItems(items: WorkItem[]): Promise<void>  // Bulk upsert
deleteItem(id: string): Promise<boolean>
getItemCount(): Promise<number>

// Sync helpers
getItemsUpdatedSince(timestamp: Date): Promise<WorkItem[]>
replaceAllItems(items: WorkItem[]): Promise<void>  // For full sync
```

#### Step 1.3: Update Config (`server/src/config.ts`)

Add MongoDB configuration:
```typescript
mongodb: {
  uri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'notion-tree',
}
```

Add validation to require `MONGODB_URI`.

---

### Phase 2: Sync State Management

#### Step 2.1: Create Sync State Manager (`server/src/services/syncState.ts`)

**File Location:** `server/sync-state.json` (in server directory, gitignored)

**Schema:**
```typescript
interface SyncState {
  initialized: boolean;           // Has first full sync completed?
  lastFullSync: string | null;    // ISO timestamp of last full re-pull
  lastIncrementalSync: string | null;  // ISO timestamp of last incremental sync
  lastServerShutdown: string | null;   // ISO timestamp when server last shut down
  lastServerStartup: string | null;    // ISO timestamp when server last started
}
```

**Key Methods:**
```typescript
// File operations
loadSyncState(): SyncState
saveSyncState(state: SyncState): void

// State updates
markFullSyncComplete(): void
markIncrementalSyncComplete(): void
markServerShutdown(): void
markServerStartup(): void

// Queries
isInitialized(): boolean
getDowntimeDuration(): number | null  // milliseconds since last shutdown
needsFullSync(): boolean  // true if never synced or > 7 days
getLastSyncTimestamp(): Date | null
```

**Graceful Shutdown Integration:**
- On SIGTERM/SIGINT: Call `markServerShutdown()` before exit
- On startup: Read `lastServerShutdown` to calculate downtime

---

### Phase 3: Notion Incremental Fetch

#### Step 3.1: Add Incremental Fetch to Notion Service (`server/src/services/notion.ts`)

**New Method:**
```typescript
async fetchItemsSince(since: Date): Promise<WorkItem[]>
```

**Implementation:**
- Query each database with `last_edited_time` filter
- Use `on_or_after` operator with the timestamp
- Handle pagination (continue until `has_more: false`)
- Transform results using existing `NotionDataTransformer`
- Build relationships using existing `buildRelationships()`

**Filter Structure:**
```typescript
{
  filter: {
    timestamp: "last_edited_time",
    last_edited_time: {
      on_or_after: since.toISOString()
    }
  },
  sorts: [
    { timestamp: "last_edited_time", direction: "ascending" }
  ]
}
```

**Edge Cases:**
- If `since` is very old, this could return many items (but still fewer than full sync)
- Items deleted in Notion won't appear (handled by webhooks + weekly full sync)

---

### Phase 4: Sync Service Orchestration

#### Step 4.1: Create Sync Service (`server/src/services/syncService.ts`)

**Responsibilities:**
- Coordinate between Notion, MongoDB, and Cache
- Perform full syncs and incremental syncs
- Handle merge logic for incremental updates

**Key Methods:**
```typescript
// Full sync: Notion → MongoDB (replace all)
async performFullSync(): Promise<SyncResult>

// Incremental sync: Notion (filtered) → MongoDB (merge)
async performIncrementalSync(since: Date): Promise<SyncResult>

// Startup sync: Determine what type of sync needed
async performStartupSync(): Promise<SyncResult>

// Load cache from MongoDB
async loadCacheFromMongoDB(): Promise<void>
```

**SyncResult Type:**
```typescript
interface SyncResult {
  type: 'full' | 'incremental' | 'cache-only';
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  duration: number;  // milliseconds
  errors: string[];
}
```

**Merge Logic for Incremental Sync:**
1. Fetch items from Notion with `last_edited_time` filter
2. For each item:
   - Upsert into MongoDB (update if exists, insert if new)
   - Update in-memory cache
3. Log statistics

---

### Phase 5: Scheduler Implementation

#### Step 5.1: Create Scheduler Service (`server/src/services/scheduler.ts`)

**Dependencies:** `node-cron`

**Scheduled Tasks:**

| Task | Cron Expression | Description |
|------|----------------|-------------|
| Incremental Sync | `0 */24 * * *` (every 24h) | Fetch items modified in last 26 hours |
| Full Sync | `0 0 * * 0` (Sunday midnight) | Full re-pull, reconcile deletions |

**Key Methods:**
```typescript
initializeScheduler(): void
stopScheduler(): void
runIncrementalSyncNow(): Promise<void>  // Manual trigger
runFullSyncNow(): Promise<void>  // Manual trigger
getNextScheduledRuns(): { incremental: Date; full: Date }
```

**26-Hour Window Rationale:**
- Runs every 24 hours
- Fetches last 26 hours (2-hour overlap)
- Overlap ensures no items missed due to timing edge cases

**Implementation Notes:**
- Use `node-cron` for scheduling
- Tasks should be non-blocking (async)
- Log start/end of each sync
- Update sync state after completion
- Handle errors gracefully (log, don't crash)

---

### Phase 6: DataStore Cache Layer

#### Step 6.1: Modify DataStore (`server/src/services/dataStore.ts`)

**Current Behavior:** Source of truth, in-memory only
**New Behavior:** Read cache backed by MongoDB

**Changes:**

1. **Initialization:**
   - Remove `initialize(items)` method
   - Add `loadFromMongoDB()` method that populates cache from MongoDB

2. **Reads (unchanged interface):**
   - `getAll()` - Return from cache
   - `get(id)` - Return from cache
   - `has(id)` - Check cache

3. **Writes (now write-through):**
   - `upsert(item)`:
     1. Write to MongoDB first
     2. Update cache on success
   - `delete(id)`:
     1. Delete from MongoDB first
     2. Remove from cache on success

4. **New Methods:**
   - `refreshFromMongoDB()` - Reload entire cache from MongoDB
   - `getCacheStats()` - Cache hit/miss statistics (optional)

**Error Handling:**
- If MongoDB write fails, throw error (don't update cache)
- Cache should always reflect MongoDB state

---

### Phase 7: Webhook Updates

#### Step 7.1: Modify Webhook Handler (`server/src/routes/webhook.ts`)

**Current Flow:**
1. Receive webhook event
2. Fetch item from Notion (if needed)
3. Update in-memory DataStore

**New Flow:**
1. Receive webhook event
2. Fetch item from Notion (if needed)
3. Write to MongoDB
4. Update in-memory cache

**For Deletions (`page.deleted`):**
1. Delete from MongoDB
2. Remove from cache
3. Orphan children (update their `parentId` to null in both MongoDB and cache)

---

### Phase 8: Startup Flow Rewrite

#### Step 8.1: Modify Server Entry Point (`server/src/index.ts`)

**New Startup Sequence:**

```typescript
async function startServer() {
  // 1. Load configuration
  const config = loadConfig();

  // 2. Connect to MongoDB (fail if unavailable)
  await initializeMongoDB(config.mongodb.uri);
  logger.info('Connected to MongoDB Atlas');

  // 3. Initialize services
  initializeNotion(config.notion);
  initializeDataStore();  // Empty cache initially

  // 4. Load sync state
  const syncState = loadSyncState();
  markServerStartup();

  // 5. Perform appropriate sync
  if (!syncState.initialized) {
    // First ever run: full sync
    logger.info('First run detected, performing full Notion sync...');
    await performFullSync();
  } else {
    // Check for downtime
    const downtime = getDowntimeDuration();
    if (downtime && downtime > 0) {
      // Server was down, do incremental sync for missed period
      const since = new Date(syncState.lastServerShutdown!);
      logger.info(`Server was down for ${downtime}ms, syncing changes since ${since.toISOString()}`);
      await performIncrementalSync(since);
    }
    // Load cache from MongoDB
    await loadCacheFromMongoDB();
  }

  // 6. Check if full sync is overdue (> 7 days)
  if (needsFullSync()) {
    logger.info('Full sync overdue, scheduling immediate full sync...');
    await performFullSync();
  }

  // 7. Start scheduler
  initializeScheduler();

  // 8. Start Express server
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
}
```

**Graceful Shutdown Updates:**

```typescript
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');

  // Stop scheduler
  stopScheduler();

  // Mark shutdown time
  markServerShutdown();

  // Close MongoDB connection
  await closeMongoDB();

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

---

### Phase 9: API Route Updates

#### Step 9.1: Modify Items Routes (`server/src/routes/items.ts`)

**Changes:**

1. **GET `/api/items`** - No change (reads from cache)

2. **GET `/api/items/:id`** - No change (reads from cache)

3. **PATCH `/api/items/:id/status`**:
   - Update Notion first (existing)
   - Update MongoDB
   - Update cache

4. **PATCH `/api/items/:id/progress`**:
   - Update Notion first (existing)
   - Update MongoDB
   - Update cache

5. **POST `/api/items/sync`** (force sync):
   - Add query param `?type=full|incremental`
   - Default to incremental
   - Trigger appropriate sync

6. **New: GET `/api/sync/status`**:
   - Return sync state (last sync times, next scheduled syncs)

---

## File Changes Summary

### New Files (4)
1. `server/src/services/mongodb.ts` - MongoDB connection and operations
2. `server/src/services/syncState.ts` - Sync state JSON file manager
3. `server/src/services/scheduler.ts` - Cron-based task scheduler
4. `server/src/services/syncService.ts` - Sync orchestration logic

### Modified Files (6)
1. `server/src/index.ts` - New startup/shutdown flow
2. `server/src/config.ts` - MongoDB configuration
3. `server/src/services/dataStore.ts` - Convert to cache layer
4. `server/src/services/notion.ts` - Add incremental fetch
5. `server/src/routes/webhook.ts` - Write to MongoDB
6. `server/src/routes/items.ts` - Write-through to MongoDB

### Configuration Files (2)
1. `server/package.json` - Add dependencies
2. `.env.example` - Add MongoDB variables

### New Runtime Files (1)
1. `server/sync-state.json` - Sync timestamps (gitignored)

---

## Dependencies to Add

```json
{
  "dependencies": {
    "mongodb": "^6.12.0",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

---

## Environment Variables

Add to `.env.example` and `.env`:

```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
MONGODB_DB_NAME=notion-tree  # Optional, can be in URI
```

---

## Testing Considerations

### New Tests Needed

1. **MongoDB Service Tests:**
   - Connection handling
   - CRUD operations
   - Bulk upsert behavior
   - Index creation

2. **Sync State Tests:**
   - File read/write
   - State transitions
   - Downtime calculation

3. **Scheduler Tests:**
   - Task scheduling
   - Manual trigger
   - Graceful stop

4. **Sync Service Tests:**
   - Full sync flow
   - Incremental sync flow
   - Merge logic
   - Error handling

5. **Integration Tests:**
   - Startup with empty MongoDB
   - Startup with existing data
   - Webhook → MongoDB → Cache flow

### Testing Strategy
- Use MongoDB Memory Server for unit tests (no real Atlas needed)
- Mock Notion API responses
- Test sync state file operations with temp directory

---

## Migration Path

### For Existing Deployments

1. **Before upgrade:**
   - No action needed (data is ephemeral anyway)

2. **First startup with new code:**
   - MongoDB connection required
   - Full sync will populate MongoDB
   - sync-state.json will be created

3. **Rollback plan:**
   - Remove MongoDB requirement from config
   - Revert to previous code
   - Server will do full Notion pull as before

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| MongoDB Atlas downtime | Server fails to start (as requested); implement health checks |
| Large initial sync | Show progress logs; consider chunked processing |
| Webhook and scheduled sync race condition | Use `updatedAt` timestamp comparison; skip if stale |
| sync-state.json corruption | Validate JSON on load; reset to defaults if invalid |
| Memory pressure from large datasets | MongoDB handles storage; cache is still limited by RAM |

---

## Implementation Order

1. **Phase 1**: MongoDB Foundation (connection, CRUD, config)
2. **Phase 2**: Sync State Manager (JSON file operations)
3. **Phase 3**: Notion Incremental Fetch (add filtered query method)
4. **Phase 4**: Sync Service (orchestration logic)
5. **Phase 5**: Scheduler (cron jobs)
6. **Phase 6**: DataStore Cache Layer (modify existing)
7. **Phase 7**: Webhook Updates (write-through)
8. **Phase 8**: Startup Flow (integrate all components)
9. **Phase 9**: API Route Updates (minor changes)
10. **Phase 10**: Testing and Documentation

---

## Open Questions / Decisions Made

| Question | Decision |
|----------|----------|
| MongoDB deployment | MongoDB Atlas (cloud-hosted) |
| Deletion handling | Webhooks + weekly full sync as backup |
| Scheduler type | In-process (node-cron) |
| In-memory store | Keep as cache layer on top of MongoDB |
| Time tracker storage | Simple JSON file |
| MongoDB unavailable | Fail startup |

---

## Estimated Complexity

| Phase | Complexity | Key Challenge |
|-------|-----------|---------------|
| 1. MongoDB Foundation | Medium | Connection management, error handling |
| 2. Sync State | Low | Simple file I/O |
| 3. Notion Incremental | Medium | Filter syntax, pagination |
| 4. Sync Service | Medium | Merge logic, orchestration |
| 5. Scheduler | Low | node-cron is straightforward |
| 6. DataStore Cache | Medium | Write-through consistency |
| 7. Webhook Updates | Low | Add MongoDB writes |
| 8. Startup Flow | High | Integrate all components correctly |
| 9. API Routes | Low | Minor additions |
