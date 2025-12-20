# Notion Opportunity Tree Visualizer

An interactive visualization tool for HouseSigma that displays work items (problems, solutions, designs, projects) in a hierarchical opportunity tree structure, integrated with Notion.

## Features

### Interactive Tree/Hierarchy View
- Expandable/collapsible tree nodes showing parent-child relationships
- Visual connection lines between related items
- Click to select and view detailed information
- Navigate through the tree to understand how work items connect to company mission

### Color Coding by Status
- **Not Started** (gray) - Work that hasn't begun
- **In Progress** (blue) - Active work with progress indicator
- **Blocked** (red) - Work blocked by dependencies
- **In Review** (amber) - Work awaiting review
- **Completed** (green) - Finished work

### Color Coding by Type
- **Mission** (violet) - Top-level company objectives
- **Problem** (red) - Issues to be solved
- **Solution** (blue) - Proposed solutions to problems
- **Design** (fuchsia) - Design work and mockups
- **Project** (cyan) - Implementation projects

### Filtering & Search
- Filter by type (Mission, Problem, Solution, Design, Project)
- Filter by status (Not Started, In Progress, Blocked, In Review, Completed)
- Filter by priority (P0-P3)
- Filter by owner
- Search by title, description, or tags

### Dashboard Statistics
- Total items count
- Completion rate percentage
- Blocked items alert
- Overdue items tracking
- In-progress work visibility
- Status and type breakdown charts

### Notion Integration
- Connect to your Notion workspace
- Sync work items from Notion database
- Configurable property mappings
- Open items directly in Notion

## User Scenarios

### Individual Contributors
See how your assigned solutions, designs, or projects connect to company mission and prioritize competing work items.

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
```

### Connecting to Notion

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Share your database with the integration
3. Click the Settings icon in the app header
4. Enter your API key and database ID
5. Configure property mappings if needed

### Demo Mode

The app includes sample data demonstrating the opportunity tree structure. Click "Use Demo Data" in the settings modal to explore without Notion.

## Database Schema

Your Notion database should have these properties (configurable in settings):

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Work item title |
| Type | Select | Mission, Problem, Solution, Design, Project |
| Status | Select | Not Started, In Progress, Blocked, In Review, Completed |
| Priority | Select | P0, P1, P2, P3 |
| Owner | People | Assigned owner |
| Parent | Relation | Parent work item |
| Progress | Number | Completion percentage (0-100) |
| Due Date | Date | Target completion date |
| Tags | Multi-select | Categorization tags |

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@notionhq/client** - Notion API
- **Lucide React** - Icons

## Project Structure

```
src/
├── components/
│   ├── tree/           # Tree visualization components
│   ├── filters/        # Filter panel components
│   └── common/         # Shared components (Header, DetailPanel, etc.)
├── services/           # Notion API service
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (colors, sample data)
└── App.tsx             # Main application component
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
- Click any item to see full upstream path to mission
- Breadcrumb navigation in detail panel
- Focus mode with item highlighting

### For Joseph
- Self-service problem exploration
- Clear visibility into problem resolution paths
- Empowers individual contributors to push progress
