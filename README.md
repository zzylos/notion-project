# Notion Opportunity Tree Visualizer

An interactive visualization tool for HouseSigma that displays work items (objectives, problems, solutions, projects, deliverables) in a hierarchical opportunity tree structure, integrated with Notion.

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

#### List View

- Spreadsheet-style tabular view of all items
- Columns: Status, Title, Type, Priority, Owner, Progress
- Virtualized scrolling for large datasets (1000+ items)
- Smooth performance with @tanstack/react-virtual

#### Timeline View

- Chronological view of items with due dates
- Visual timeline with status indicators
- Overdue item highlighting
- Sorted by due date

### Multi-Database Support

Connect up to 5 separate Notion databases, each mapped to a specific item type:

| Database         | Type     | Icon            | Description                       |
| ---------------- | -------- | --------------- | --------------------------------- |
| **Objectives**   | mission  | Purple target   | High-level goals and objectives   |
| **Problems**     | problem  | Red warning     | Issues and challenges to solve    |
| **Solutions**    | solution | Amber lightbulb | Proposed solutions and approaches |
| **Projects**     | project  | Blue folder     | Active projects and initiatives   |
| **Deliverables** | design   | Green package   | Outputs and deliverables          |

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
- **Solutions** (amber) - Proposed solutions to problems
- **Projects** (blue) - Implementation projects
- **Deliverables** (green) - Design work and outputs

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
- CORS proxy support for browser-based API calls

### Performance Optimizations

- **5-minute caching** - Reduces redundant API calls to Notion
- **Progressive loading** - See items as they load with progress bar
- **Virtualized lists** - Smooth scrolling for thousands of items
- **Force refresh** - Clear cache and reload data when needed

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
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Quick Setup with Environment Variables

### note to self - use .env config or everythings fucked, fix that later

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

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@xyflow/react** - Canvas/node visualization
- **@tanstack/react-virtual** - List virtualization
- **Lucide React** - Icons
- **D3.js** - Data visualization utilities

## Project Structure

```
src/
├── components/
│   ├── canvas/         # Canvas view (CanvasView, CanvasNode)
│   ├── tree/           # Tree visualization components
│   ├── views/          # KanbanView, ListView, TimelineView
│   ├── filters/        # Filter panel components
│   └── common/         # Shared components (Header, DetailPanel, etc.)
├── services/           # Notion API service with multi-database support
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
├── utils/
│   ├── colors.ts       # Color utilities and status mapping
│   ├── config.ts       # Environment variable configuration loader
│   └── sampleData.ts   # Demo data for offline use
└── App.tsx             # Main application with all view modes

scripts/
└── test-notion-connection.js   # API credential validation script

.env.example            # Template for environment configuration
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

- Data is cached for 5 minutes
- Use the refresh button to force-reload data
- Progressive loading shows items as they arrive
- List view uses virtualization for smooth scrolling

### Canvas View Performance

For databases with 500+ items:

- The canvas will render all visible nodes
- Use filters to reduce the number of visible items
- Drag nodes to reorganize as needed

## Configuration Options

The app supports two configuration methods:

### 1. Environment Variables (Recommended for Development)

Create a `.env` file based on `.env.example`. Environment config takes precedence over UI settings.

| Variable                  | Description                                 |
| ------------------------- | ------------------------------------------- |
| `VITE_NOTION_API_KEY`     | Your Notion API key (required)              |
| `VITE_NOTION_DB_MISSION`  | Objectives database ID                      |
| `VITE_NOTION_DB_PROBLEM`  | Problems database ID                        |
| `VITE_NOTION_DB_SOLUTION` | Solutions database ID                       |
| `VITE_NOTION_DB_PROJECT`  | Projects database ID                        |
| `VITE_NOTION_DB_DESIGN`   | Deliverables database ID                    |
| `VITE_MAPPING_*`          | Property name mappings (see `.env.example`) |
| `VITE_CORS_PROXY`         | Custom CORS proxy URL                       |

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
