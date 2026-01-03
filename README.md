# Notion Opportunity Tree Visualizer

An interactive visualization tool for HouseSigma that displays work items (objectives, problems, solutions, projects, deliverables) in a hierarchical opportunity tree structure, integrated with Notion.

Project tracker:
https://www.notion.so/project-can-not-visualize-in-progress-work-with-hierarchy-2cfc2345ab4680a69503f5cbf6ed76bb

## Features

### Multiple View Modes

#### Tree View (Default)

- Expandable/collapsible tree nodes showing parent-child relationships
- Visual connection lines between related items
- Click to select and view detailed information
- Expand/collapse all functionality
- Navigate through the tree to understand how work items connect to company objectives

#### Canvas View

- Interactive node-based visualization similar to Obsidian Canvas
- Hierarchical layout with automatic node positioning
- Drag and drop nodes to reorganize the view
- Reset Layout button to restore original positions
- Fullscreen mode for focused work
- Smooth edge connections between parent-child items
- Color-coded nodes by type

#### Kanban View

- Board-style view organized by status columns
- Dynamic columns based on your Notion database statuses
- Click cards to view details
- Visual item count per column

#### Timeline View

- Chronological view of items with due dates
- Visual timeline with status indicators
- Overdue item highlighting
- Sorted by due date

### Multi-Database Support

Connect up to 5 separate Notion databases, each mapped to a specific item type:

| Database         | Type     | Icon            | Description                       |
| ---------------- | -------- | --------------- | --------------------------------- |
| **Objectives**   | mission  | Violet target   | High-level goals and objectives   |
| **Problems**     | problem  | Red warning     | Issues and challenges to solve    |
| **Solutions**    | solution | Blue lightbulb  | Proposed solutions and approaches |
| **Projects**     | project  | Cyan folder     | Active projects and initiatives   |
| **Deliverables** | design   | Fuchsia package | Outputs and deliverables          |

Parent relations work **across databases** - a Solution can have a Problem as its parent, a Deliverable can link to a Project, etc.

### Dynamic Status Labels

Status labels are automatically imported from your Notion database. The app intelligently maps statuses to color categories:

- **Not Started** category (gray) - "Not started", "Backlog", "To Do", etc.
- **In Progress** category (blue) - "In Progress", "Analysis/Research", "Solutioning", "Prioritization", "Scheduling", "Project in progress", etc.
- **Blocked** category (red) - "Blocked", "On Hold", "Duplicate", etc.
- **In Review** category (amber) - "In Review", "Post mortem", "QA", etc.
- **Completed** category (green) - "Completed", "Done", "Closed", etc.

### Color Coding by Type

- **Objectives** (violet) - Top-level company objectives
- **Problems** (red) - Issues to be solved
- **Solutions** (blue) - Proposed solutions to problems
- **Projects** (cyan) - Implementation projects
- **Deliverables** (fuchsia) - Design work and outputs

### Filtering & Search

- Filter by type (Objectives, Problems, Solutions, Projects, Deliverables)
- Filter by status (dynamically populated from your data)
- Filter by priority (P0-P3)
- Filter by owner
- Search by title, description, or tags

### Dashboard Statistics

- Collapsible statistics overview panel
- Total items count
- Completion rate percentage
- Blocked items alert
- Overdue items tracking
- In-progress work visibility
- Status and type breakdown charts

### Notion Integration

- Connect to multiple Notion databases
- Sync work items from each database with correct type assignment
- Configurable property mappings
- Open items directly in Notion

### Performance Optimizations

- **Real-time webhook sync** - Data updated instantly via Notion webhooks
- **Progressive loading** - See items as they load with progress bar
- **Virtualized lists** - Smooth scrolling for thousands of items
- **Force refresh** - Trigger full re-sync from Notion when needed

### Backend Server Architecture

The app uses a backend server for secure, real-time Notion integration:

- **Secure API key handling** - Keys stay on the server, not in the browser
- **Real-time updates** - Notion webhooks push changes instantly (no polling)
- **Persistent data store** - In-memory store with webhook-driven updates

## User Scenarios

### Individual Contributors

See how your assigned solutions, deliverables, or projects connect to company objectives and prioritize competing work items.

### Team Leads & Managers

Allocate resources effectively and communicate problem dependencies and relationships across teams.

### Leadership Team

Assess organizational alignment and identify bottlenecks in the problem cluster execution.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies (includes backend server)
npm install

# Start frontend development server
npm run dev

# Start backend API server
npm run dev:server

# Start both frontend and backend together
npm run dev:full

# Build frontend for production
npm run build

# Build both frontend and backend
npm run build:all

# Code quality
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run typecheck    # Run TypeScript type checking
npm run format       # Format code with Prettier

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
```

### Quick Setup with Environment Variables

The easiest way to configure the app is with a `.env` file:

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
```

Example `.env` configuration:

```bash
# Required
VITE_NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Add your database IDs (at least one required)
VITE_NOTION_DB_MISSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROBLEM=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_SOLUTION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROJECT=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_DESIGN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Custom property mappings
VITE_MAPPING_STATUS=Status
VITE_MAPPING_PRIORITY=Priority
VITE_MAPPING_OWNER=Owner
```

When using environment configuration, a green indicator appears below the header confirming the config source.

### Testing Notion Connection

Before configuring the app, you can validate your Notion API credentials:

```bash
npm run test:notion <API_KEY> <DATABASE_ID>

# Example:
npm run test:notion secret_abc123 abc123def456
```

This script will:

1. Validate your API key
2. Check database access permissions
3. Test querying the database
4. Provide helpful error messages for common issues

### Connecting to Notion

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Share **all your databases** with the integration (click "..." menu → "Add connections" on each database)
3. Click the Settings icon in the app header
4. Enter your API key
5. Enter the database ID for each type you have (leave empty for types you don't use)
6. Configure property mappings if needed (applies to all databases)

### Demo Mode

The app includes sample data demonstrating the opportunity tree structure. Click "Use Demo Data" in the settings modal to explore without Notion.

## Database Schema

Each Notion database should have these properties (configurable in settings):

| Property | Type          | Description                                             |
| -------- | ------------- | ------------------------------------------------------- |
| Name     | Title         | Work item title                                         |
| Status   | Select/Status | Your custom status labels                               |
| Priority | Select        | P0, P1, P2, P3 (or High, Medium, Low, etc.)             |
| Owner    | People        | Assigned owner                                          |
| Parent   | Relation      | Parent work item (can link to items in other databases) |
| Progress | Number        | Completion percentage (0-100)                           |
| Due Date | Date          | Target completion date                                  |
| Tags     | Multi-select  | Categorization tags                                     |

**Note:** The "Type" property is no longer needed - item type is determined by which database the item comes from.

## Tech Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@xyflow/react** - Canvas/node visualization
- **Lucide React** - Icons
- **D3.js** - Data visualization utilities
- **Vitest** - Testing framework
- **React Testing Library** - Component testing utilities

### Backend

- **Express** - Web framework
- **TypeScript** - Type safety
- **node-cache** - In-memory caching (used for stale-while-revalidate)
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable loading

## Project Structure

```
src/
├── components/
│   ├── canvas/         # Canvas view (CanvasView, CanvasNode)
│   ├── tree/           # Tree visualization components
│   ├── views/          # KanbanView, TimelineView
│   ├── filters/        # Filter panel components
│   └── common/         # Shared components (Header, DetailPanel, etc.)
├── hooks/              # Custom React hooks
├── services/
│   ├── notionService.ts  # Notion API service with multi-database support
│   └── apiClient.ts      # Backend API client (for backend mode)
├── store/              # Zustand state management
├── test/               # Test setup and utilities
│   └── setup.ts        # Vitest setup with mocks
├── types/              # TypeScript type definitions
├── utils/
│   ├── colors.ts       # Color utilities and status mapping
│   ├── config.ts       # Environment variable configuration loader
│   ├── errors.ts       # Error classes and handling utilities
│   ├── logger.ts       # Unified logging utility
│   ├── typeGuards.ts   # Type guard utilities
│   ├── validation.ts   # Input validation utilities
│   └── sampleData.ts   # Demo data for offline use
├── constants.ts        # Application-wide constants
└── App.tsx             # Main application with all view modes

server/                 # Backend API server
├── src/
│   ├── index.ts        # Express server entry point
│   ├── config.ts       # Server configuration loader
│   ├── routes/
│   │   ├── items.ts    # Items API endpoints
│   │   └── webhook.ts  # Notion webhook handler
│   ├── services/
│   │   ├── notion.ts   # Server-side Notion API service
│   │   └── dataStore.ts # Persistent in-memory data store
│   ├── middleware/
│   │   └── rateLimit.ts # Rate limiting middleware
│   ├── utils/
│   │   ├── logger.ts   # Server logging utility
│   │   └── uuid.ts     # UUID normalization utility
│   └── types/          # TypeScript types
├── package.json        # Server dependencies
└── vitest.config.ts    # Backend test configuration

scripts/
└── test-notion-connection.js   # API credential validation script

.env.example            # Template for frontend environment configuration
vitest.config.ts        # Vitest test configuration
CONTRIBUTING.md         # Development and contribution guidelines
```

## Key Features for Employee Feedback

### For Alfred

- Progress tracking shows items at 90% that need closing
- Stats overview shows in-progress work volume
- Non-technical friendly UI

### For TanWei

- Clear priority indicators (P0-P3)
- Roadmap view through tree hierarchy
- Filter to see priority-aligned problems

### For Reed

- Click any item to see full upstream path to objective
- Breadcrumb navigation in detail panel
- Focus mode with item highlighting

### For Joseph

- Self-service problem exploration
- Clear visibility into problem resolution paths
- Empowers individual contributors to push progress

## Keyboard Shortcuts

- **Escape** - Exit fullscreen mode (Canvas view)

## Troubleshooting

### Notion API Connection Issues

If you're having trouble connecting to Notion:

1. Run the test script: `npm run test:notion <API_KEY> <DATABASE_ID>`
2. Common issues:
   - **401 Unauthorized**: API key is invalid or expired
   - **404 Not Found**: Database ID is wrong or integration not added to database
   - **403 Forbidden**: Integration lacks permission to access the database

### All Items Showing Same Type

If all items appear as the same type (e.g., all "Projects"):

- Make sure you've entered the database ID in the correct field in Settings
- Each database should be entered under its corresponding type (Objectives, Problems, etc.)

### Parent/Child Hierarchy Not Working

If items don't show parent-child relationships:

- Ensure your databases have a "Parent" relation property
- The relation can link to items in any of your connected databases
- Check the browser console for debug info about detected properties

### Slow Loading with Large Databases

The app includes several optimizations for large databases:

- Data is cached server-side and updated via webhooks
- Use the refresh button to force re-sync from Notion
- Progressive loading shows items as they arrive

### Canvas View Performance

For databases with 500+ items:

- The canvas will render all visible nodes
- Use filters to reduce the number of visible items
- Drag nodes to reorganize as needed

## Backend Server with Webhooks

The app uses a backend server for secure Notion integration. This provides:

- **Secure API key handling** - Keys stay on the server, not in the browser
- **Real-time updates** - Notion webhooks push changes instantly to your server
- **No CORS proxy needed** - Direct server-to-Notion communication
- **Persistent data store** - In-memory store updated via webhooks (no polling)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVER STARTUP                          │
│  Fetch all items from all databases (once)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENT DATA STORE                     │
│  In-memory Map (no TTL, updated via webhooks in real-time)  │
└─────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
    ┌──────────────┐                ┌─────────────────────┐
    │ GET /api/    │                │ POST /api/webhook   │
    │  /items      │◀───────────────│  (from Notion)      │
    │  /store/     │   Updates      │ with HMAC signature │
    │  stats       │   store        │ validation          │
    └──────────────┘                └─────────────────────┘
          │
          ▼
    ┌──────────────┐
    │   Browser    │
    │  (Frontend)  │
    └──────────────┘
```

### Setting Up the Backend

1. **Configure the root `.env` file** (used by both frontend and backend):

```bash
# Copy the example file
cp .env.example .env

# Edit with your Notion credentials
VITE_NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_NOTION_DB_MISSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROBLEM=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_SOLUTION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROJECT=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_DESIGN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Backend URL
VITE_API_URL=http://localhost:3001  # or your production URL

# Backend-specific settings
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Webhook secret (set after webhook verification - see below)
# NOTION_WEBHOOK_SECRET=secret_xxxxx
```

2. **Start both servers**:

```bash
npm run dev:full
```

3. **Set up Notion webhooks** (see next section for details)

### Setting Up Notion Webhooks

Notion webhooks enable real-time data synchronization. When a page is created, updated, or deleted in Notion, your server is notified instantly.

#### Prerequisites

Before setting up webhooks, ensure you have:

1. **A Notion integration** created at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. **Your databases shared** with the integration
3. **The backend server running** (locally or deployed)
4. **A publicly accessible URL** for webhook delivery (use ngrok for local development)

#### Step 1: Make Your Server Publicly Accessible

Notion needs to reach your server to send webhook events. For local development, use ngrok:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Start your backend server
npm run dev:server

# In a new terminal, create a tunnel to your server
ngrok http 3001
```

ngrok will display a forwarding URL like:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:3001
```

Copy this URL - you'll use it in the next step. For production, use your actual server URL (e.g., `https://api.yourapp.com`).

#### Step 2: Create Webhook Subscription in Notion

1. Go to [Notion Integrations](https://www.notion.so/profile/integrations)
2. Click on your integration name to open settings
3. Navigate to the **Webhooks** tab in the left sidebar
4. Click **+ Create subscription**
5. Configure the subscription:
   - **Webhook URL**: Enter `https://your-ngrok-url.ngrok.io/api/webhook` (or your production URL)
   - **Events to subscribe**: Select the following:
     - ✅ `page.content_updated` - When page properties change
     - ✅ `page.created` - When a new page is added
     - ✅ `page.deleted` - When a page is deleted
     - ✅ `page.moved` - When a page's parent changes
     - ✅ `page.undeleted` - When a page is restored
     - ✅ `page.unlocked` - When a page is unlocked
     - ☑️ `database.schema_updated` - Optional, for schema change notifications
6. Click **Create**

#### Step 3: Capture the Verification Token

When you create the subscription, Notion immediately sends a verification request to your webhook URL. Your server will log the verification token:

```
[Webhook] Received verification token. Configure NOTION_WEBHOOK_SECRET:
[Webhook] NOTION_WEBHOOK_SECRET=secret_abc123xyz...
```

**Important**: Copy this entire token value (including the `secret_` prefix).

If you missed the token in the logs, you can:

- Delete and recreate the webhook subscription, OR
- Check your server's console output history

#### Step 4: Configure the Webhook Secret

Add the verification token to your `.env` file:

```bash
# Add this line to your .env file
NOTION_WEBHOOK_SECRET=secret_abc123xyz...
```

Then restart your server to load the new configuration:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev:server
```

#### Step 5: Complete Verification in Notion

1. Return to the Notion webhook settings page
2. You'll see a verification modal asking for the token
3. Paste the same token you added to `.env`
4. Click **Verify**

The webhook status should change to **Active** ✅

#### Step 6: Test the Webhook

1. Make a change to any page in your connected Notion databases
2. Check your server logs - you should see:

```
[Webhook] Received event: page.content_updated for page abc123...
[Webhook] Updated item: abc123 (Item Title, type: project)
```

3. Refresh your frontend - the change should appear instantly

#### Troubleshooting Webhooks

| Problem                        | Solution                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Webhook shows "Pending"**    | Server isn't reachable. Check ngrok is running and URL is correct.                                            |
| **"Invalid signature" errors** | Ensure `NOTION_WEBHOOK_SECRET` matches the token exactly. Restart server after changing.                      |
| **Events not being received**  | Verify the page's database is connected to your integration. Check Notion's webhook logs for delivery status. |
| **ngrok tunnel expired**       | Free ngrok tunnels expire. Restart ngrok and update the webhook URL in Notion.                                |
| **Server crashes on webhook**  | Check server logs for errors. Ensure all database IDs are correctly configured.                               |

#### Checking Webhook Status

You can verify your webhook configuration via the API:

```bash
# Check webhook status
curl http://localhost:3001/api/webhook/status

# Response shows if token is configured:
# {"configured": true, "message": "Webhook secret is configured"}
```

#### Manual Token Configuration

If you need to set the token without restarting the server:

```bash
curl -X POST http://localhost:3001/api/webhook/set-token \
  -H "Content-Type: application/json" \
  -d '{"token": "secret_abc123xyz..."}'
```

**Note**: This only stores the token in memory. Add it to `.env` for persistence across restarts.

### Webhook Events Handled

| Event Type                | Action                         |
| ------------------------- | ------------------------------ |
| `page.content_updated`    | Refetch page, update store     |
| `page.created`            | Fetch new page, add to store   |
| `page.deleted`            | Remove from store              |
| `page.moved`              | Refetch to get new parent      |
| `page.undeleted`          | Refetch and add back to store  |
| `page.unlocked`           | Refetch and update store       |
| `database.schema_updated` | Logged (manual sync if needed) |

### Backend API Endpoints

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

### Webhook Security

The server validates webhook signatures using HMAC-SHA256:

- Notion includes `X-Notion-Signature` header with each request
- Server computes expected signature using `NOTION_WEBHOOK_SECRET`
- Requests with invalid signatures are rejected (401)
- Uses timing-safe comparison to prevent timing attacks

**Setup mode**: Before the first token is configured, the server accepts unsigned requests to allow initial verification. Once a token is set, signature validation becomes mandatory.

### Production Deployment

For production, you can deploy the backend separately:

```bash
# Build the backend
npm run build:server

# Start production server
npm run start:server
```

Update your frontend's `VITE_API_URL` to point to your production backend URL.

**Important for webhooks**: Your server must be publicly accessible for Notion to send webhook events. Use a service like ngrok for local development:

```bash
ngrok http 3001
# Use the ngrok URL when setting up the webhook subscription
```

## Configuration Options

The app supports two configuration methods:

### 1. Environment Variables (Recommended for Development)

Create a `.env` file based on `.env.example`. Environment config takes precedence over UI settings.

| Variable                        | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `VITE_NOTION_API_KEY`           | Your Notion API key (used by backend server)       |
| `VITE_NOTION_DB_MISSION`        | Objectives database ID                             |
| `VITE_NOTION_DB_PROBLEM`        | Problems database ID                               |
| `VITE_NOTION_DB_SOLUTION`       | Solutions database ID                              |
| `VITE_NOTION_DB_PROJECT`        | Projects database ID                               |
| `VITE_NOTION_DB_DESIGN`         | Deliverables database ID                           |
| `VITE_MAPPING_*`                | Property name mappings (see `.env.example`)        |
| `VITE_API_URL`                  | Backend API URL (default: `http://localhost:3001`) |
| `VITE_DISABLE_CONFIG_UI`        | Set to `true` to disable UI configuration          |
| `VITE_REFRESH_COOLDOWN_MINUTES` | Rate limit for refresh button (default: 2 minutes) |

### 2. UI Settings Modal

Click the Settings icon in the header to configure via the UI. Settings are saved to localStorage.

- Validates database ID format (UUID)
- Shows green checkmark for valid IDs
- Supports custom property mappings

## Recent Improvements

### Bug Fixes

- **Race condition prevention** - Concurrent data fetches are properly cancelled
- **Failed database notifications** - Warning banner when some databases fail to load
- **Circular reference protection** - Tree view won't freeze on circular parent relationships
- **Orphaned item logging** - Debug mode logs items with missing parent references
- **Database ID validation** - UUID format validation with visual feedback

### Quality of Life

- **Environment variable config** - Configure via `.env` file instead of UI
- **Sticky header/filters** - Header and filters stay visible while scrolling
- **Improved canvas usability** - Canvas view works better without fullscreen mode
- **Config source indicator** - Shows when using `.env` configuration

### Developer Experience

- **Testing infrastructure** - Vitest with React Testing Library and 200+ unit tests
- **Unified logging** - Consistent, color-coded console output via logger utility
- **Error handling utilities** - Custom error classes with retry logic
- **Type guards** - Runtime type checking utilities for safer code
- **ESLint complexity rules** - Automated detection of overly complex code
- **Optimized builds** - Vite chunk splitting for better caching

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code style guidelines, and contribution process.
