# Notion Opportunity Tree Visualizer

An interactive visualization tool for HouseSigma that displays work items (objectives, problems, solutions, projects, deliverables) in a hierarchical opportunity tree structure, integrated with Notion.

Project tracker:
https://www.notion.so/project-can-not-visualize-in-progress-work-with-hierarchy-2cfc2345ab4680a69503f5cbf6ed76bb

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (for data persistence)
- Notion integration with API key

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

### Setting Up the Backend

The app uses a backend server for secure, real-time Notion integration:

- **Secure API key handling** - Keys stay on the server, not in the browser
- **Real-time updates** - Notion webhooks push changes instantly to your server
- **No CORS proxy needed** - Direct server-to-Notion communication
- **Persistent data store** - MongoDB storage with in-memory cache

#### Step 1: Set Up MongoDB Atlas

The backend requires MongoDB Atlas for data persistence:

1. **Create a MongoDB Atlas account** at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Create a new cluster** (the free M0 tier works for development)
3. **Set up database access**:
   - Go to "Database Access" and create a database user
   - Note the username and password
4. **Set up network access**:
   - Go to "Network Access" and add your IP address (or `0.0.0.0/0` for development)
5. **Get your connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like `mongodb+srv://username:password@cluster.mongodb.net/`)

#### Step 2: Configure Environment Variables

Create your `.env` file from the example:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# ============================================
# Notion Configuration (Required)
# ============================================
VITE_NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database IDs (at least one required)
VITE_NOTION_DB_MISSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROBLEM=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_SOLUTION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROJECT=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_DESIGN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# ============================================
# MongoDB Configuration (Required)
# ============================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/notion-tree
MONGODB_DB_NAME=notion-tree

# ============================================
# Server Configuration
# ============================================
VITE_API_URL=http://localhost:3001  # Backend URL for frontend
PORT=3001                            # Backend server port
CORS_ORIGIN=http://localhost:5173    # Frontend URL for CORS

# Webhook secret (set after webhook verification - see below)
# NOTION_WEBHOOK_SECRET=secret_xxxxx
```

#### Step 3: Install Dependencies

```bash
# Install all dependencies (frontend, backend, and shared)
npm install
cd server && npm install && cd ..
```

#### Step 4: Start the Application

```bash
# Start both frontend and backend together
npm run dev:full
```

This starts:

- Frontend at `http://localhost:5173`
- Backend at `http://localhost:3001`

On first startup, the server will:

1. Connect to MongoDB Atlas
2. Perform a full sync from all configured Notion databases
3. Store all items in MongoDB
4. Load data into the in-memory cache
5. Start the scheduler for automatic syncs

#### Step 5: Set Up Notion Webhooks (Recommended)

Notion webhooks enable real-time data synchronization. When a page is created, updated, or deleted in Notion, your server is notified instantly.

**Prerequisites for webhooks:**

1. **A Notion integration** created at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. **Your databases shared** with the integration
3. **The backend server running** (locally or deployed)
4. **A publicly accessible URL** for webhook delivery (use ngrok for local development)

**Make your server publicly accessible (local development):**

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

**Create webhook subscription in Notion:**

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

**Capture the verification token:**

When you create the subscription, Notion immediately sends a verification request. Your server will log the token:

```
[Webhook] Received verification token. Configure NOTION_WEBHOOK_SECRET:
[Webhook] NOTION_WEBHOOK_SECRET=secret_abc123xyz...
```

**Configure the webhook secret:**

Add the verification token to your `.env` file:

```bash
# Add this line to your .env file
NOTION_WEBHOOK_SECRET=secret_abc123xyz...
```

Restart your server, then complete verification in Notion UI by pasting the same token. The webhook status should change to **Active** ✅

**Test the webhook:**

1. Make a change to any page in your connected Notion databases
2. Check your server logs - you should see:

```
[Webhook] Received event: page.content_updated for page abc123...
[Webhook] Updated item: abc123 (Item Title, type: project)
```

## Production Deployment

This section covers deploying the application to production environments.

### Prerequisites

Before deploying, ensure you have:

1. **MongoDB Atlas cluster** with a production-ready tier (M10+ recommended for production workloads)
2. **Notion integration** with all databases shared
3. **A domain name** (optional but recommended)
4. **SSL certificate** (required for webhooks - Notion only sends to HTTPS endpoints)

### Option 1: Manual Deployment (VPS/Cloud VM)

#### Step 1: Build the Application

```bash
# Build frontend
npm run build

# Build backend
cd server && npm run build && cd ..
```

This creates:

- `dist/` - Production frontend (static files)
- `server/dist/` - Compiled backend (Node.js)

#### Step 2: Set Up Production Environment

Create a production `.env` file on your server:

```bash
# ============================================
# Production Environment Variables
# ============================================

# Notion Configuration
VITE_NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_NOTION_DB_MISSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROBLEM=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_SOLUTION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_PROJECT=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_DB_DESIGN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# MongoDB (use production cluster)
MONGODB_URI=mongodb+srv://user:password@production-cluster.mongodb.net/notion-tree
MONGODB_DB_NAME=notion-tree

# Server Configuration
PORT=3001
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://api.your-domain.com

# Webhook (set after initial setup)
NOTION_WEBHOOK_SECRET=secret_xxxxx

# Production Settings
NODE_ENV=production
VITE_DISABLE_CONFIG_UI=true
VITE_REFRESH_COOLDOWN_MINUTES=5
```

#### Step 3: Run with Process Manager

Use PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start the backend
cd server
pm2 start dist/index.js --name "notion-tree-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Step 4: Set Up Reverse Proxy (Nginx)

Example Nginx configuration for both frontend and backend:

```nginx
# Frontend (static files)
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/notion-tree/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

#### Dockerfile for Backend

Create `server/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../shared ../shared

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB_NAME=${MONGODB_DB_NAME}
      - VITE_NOTION_API_KEY=${VITE_NOTION_API_KEY}
      - VITE_NOTION_DB_MISSION=${VITE_NOTION_DB_MISSION}
      - VITE_NOTION_DB_PROBLEM=${VITE_NOTION_DB_PROBLEM}
      - VITE_NOTION_DB_SOLUTION=${VITE_NOTION_DB_SOLUTION}
      - VITE_NOTION_DB_OBJECTIVE=${VITE_NOTION_DB_OBJECTIVE}
      - VITE_NOTION_DB_PROJECT=${VITE_NOTION_DB_PROJECT}
      - VITE_NOTION_DB_DELIVERABLE=${VITE_NOTION_DB_DELIVERABLE}
      - VITE_NOTION_DB_TASK=${VITE_NOTION_DB_TASK}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - NOTION_WEBHOOK_SECRET=${NOTION_WEBHOOK_SECRET}
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

### Option 3: Cloud Platform Deployment

#### Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Add environment variables in the Railway dashboard
3. Railway auto-detects Node.js and deploys

#### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your repository
3. Set build command: `cd server && npm install && npm run build`
4. Set start command: `cd server && npm start`
5. Add environment variables

#### Vercel (Frontend) + Railway/Render (Backend)

For best performance, deploy frontend and backend separately:

**Frontend on Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
vercel --prod
```

**Backend on Railway/Render** (as described above)

### Post-Deployment Checklist

After deploying, verify the following:

1. **Health check**: `curl https://api.your-domain.com/api/health`
2. **MongoDB connection**: Check the health endpoint shows MongoDB stats
3. **Notion sync**: Verify items are loaded in the frontend
4. **Webhook setup**: Configure webhook with your production URL
5. **SSL**: Ensure HTTPS is working (required for webhooks)

### Monitoring and Maintenance

#### Sync Status Endpoint

Check sync status at any time:

```bash
curl https://api.your-domain.com/api/sync/status
```

Response includes:

- Last full sync timestamp
- Last incremental sync timestamp
- Next scheduled sync times
- Whether a full sync is needed

#### Force Sync

Trigger a manual sync if needed:

```bash
# Full sync (replaces all data)
curl -X POST https://api.your-domain.com/api/items/sync?type=full

# Incremental sync (last 26 hours only)
curl -X POST https://api.your-domain.com/api/items/sync?type=incremental
```

#### Log Monitoring

Monitor server logs for:

- Webhook events: `[Webhook] Received event: page.content_updated`
- Sync operations: `[Notion] Full sync completed: 150 items`
- Errors: `[Error]` prefix indicates issues

## Troubleshooting

### MongoDB Connection Issues

If the server fails to start with MongoDB errors:

| Error                       | Cause                        | Solution                                      |
| --------------------------- | ---------------------------- | --------------------------------------------- |
| `MONGODB_URI is required`   | Missing environment variable | Add `MONGODB_URI` to your `.env` file         |
| `MongoServerSelectionError` | Can't reach MongoDB          | Check your network access settings in Atlas   |
| `Authentication failed`     | Wrong credentials            | Verify username/password in connection string |
| `connection timed out`      | IP not whitelisted           | Add your IP in Atlas Network Access settings  |

**Quick fix for local development:** Add `0.0.0.0/0` to Network Access in MongoDB Atlas (allows all IPs). For production, use specific IP addresses.

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

### Webhook Issues

| Problem                        | Solution                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Webhook shows "Pending"**    | Server isn't reachable. Check ngrok is running and URL is correct.                                            |
| **"Invalid signature" errors** | Ensure `NOTION_WEBHOOK_SECRET` matches the token exactly. Restart server after changing.                      |
| **Events not being received**  | Verify the page's database is connected to your integration. Check Notion's webhook logs for delivery status. |
| **ngrok tunnel expired**       | Free ngrok tunnels expire. Restart ngrok and update the webhook URL in Notion.                                |
| **Server crashes on webhook**  | Check server logs for errors. Ensure all database IDs are correctly configured.                               |

#### Checking Webhook Status

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
- **MongoDB persistence** - Data survives server restarts with automatic sync
- **Scheduled syncs** - Daily incremental and weekly full syncs ensure consistency

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER STARTUP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Connect to MongoDB Atlas (required)                                      │
│  2. Check sync state (stored in sync-state.json)                            │
│  3. If first run: Full Notion pull → MongoDB                                │
│  4. If restart: Incremental sync for downtime period → MongoDB              │
│  5. Load MongoDB data into in-memory cache                                  │
│  6. Start scheduler for daily incremental & weekly full syncs              │
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
│   • Handle deletions  │  • Every Sunday:     │                              │
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

## Configuration Options

The app supports two configuration methods:

### 1. Environment Variables (Recommended for Development)

Create a `.env` file based on `.env.example`. Environment config takes precedence over UI settings.

| Variable                        | Required | Description                                                |
| ------------------------------- | -------- | ---------------------------------------------------------- |
| `VITE_NOTION_API_KEY`           | Yes      | Your Notion API key (used by backend server)               |
| `VITE_NOTION_DB_*`              | Yes (1+) | Database IDs (MISSION, PROBLEM, SOLUTION, PROJECT, DESIGN) |
| `MONGODB_URI`                   | Yes      | MongoDB Atlas connection string                            |
| `MONGODB_DB_NAME`               | No       | Database name (default: `notion-tree`)                     |
| `VITE_API_URL`                  | No       | Backend API URL (default: `http://localhost:3001`)         |
| `PORT`                          | No       | Backend server port (default: `3001`)                      |
| `CORS_ORIGIN`                   | No       | Frontend URL for CORS (default: `http://localhost:5173`)   |
| `NOTION_WEBHOOK_SECRET`         | No       | Webhook signature validation token                         |
| `VITE_MAPPING_*`                | No       | Property name mappings (see `.env.example`)                |
| `VITE_DISABLE_CONFIG_UI`        | No       | Set to `true` to disable UI configuration                  |
| `VITE_REFRESH_COOLDOWN_MINUTES` | No       | Rate limit for refresh button (default: 2 minutes)         |

### 2. UI Settings Modal

Click the Settings icon in the header to configure via the UI. Settings are saved to localStorage.

- Validates database ID format (UUID)
- Shows green checkmark for valid IDs
- Supports custom property mappings

## User Scenarios

### Individual Contributors

See how your assigned solutions, deliverables, or projects connect to company objectives and prioritize competing work items.

### Team Leads & Managers

Allocate resources effectively and communicate problem dependencies and relationships across teams.

### Leadership Team

Assess organizational alignment and identify bottlenecks in the problem cluster execution.

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
- **MongoDB** - Persistent data storage (via MongoDB Atlas)
- **node-cron** - Scheduled sync jobs (daily incremental, weekly full)
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
│   └── apiClient.ts      # Backend API client
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
│   │   ├── dataStore.ts # In-memory cache (fast reads)
│   │   ├── mongodb.ts  # MongoDB persistence layer
│   │   ├── syncService.ts # Full/incremental sync orchestration
│   │   ├── syncState.ts # Sync state tracking (JSON file)
│   │   └── scheduler.ts # Scheduled sync jobs (daily/weekly)
│   ├── middleware/
│   │   └── rateLimit.ts # Rate limiting middleware
│   ├── utils/
│   │   ├── logger.ts   # Server logging utility
│   │   └── uuid.ts     # UUID normalization utility
│   └── types/          # TypeScript types
├── sync-state.json     # Sync timestamps (gitignored, auto-created)
├── package.json        # Server dependencies
└── vitest.config.ts    # Backend test configuration

scripts/
└── test-notion-connection.js   # API credential validation script

.env.example            # Template for frontend environment configuration
vitest.config.ts        # Vitest test configuration
CONTRIBUTING.md         # Development and contribution guidelines
```

## Backend API Reference

### Endpoints

| Endpoint                  | Method | Description                                       |
| ------------------------- | ------ | ------------------------------------------------- |
| `/api/items`              | GET    | Fetch all items from in-memory cache              |
| `/api/items/sync`         | POST   | Force sync (query: `?type=full` or `incremental`) |
| `/api/items/:id`          | GET    | Fetch single item from cache                      |
| `/api/items/:id/status`   | PATCH  | Update item status (write-through to MongoDB)     |
| `/api/items/:id/progress` | PATCH  | Update item progress (write-through to MongoDB)   |
| `/api/sync/status`        | GET    | Get sync status and next scheduled sync times     |
| `/api/webhook`            | POST   | Receive Notion webhook events                     |
| `/api/webhook/status`     | GET    | Check webhook configuration status                |
| `/api/webhook/set-token`  | POST   | Manually set verification token                   |
| `/api/store/stats`        | GET    | Get store/cache statistics                        |
| `/api/health`             | GET    | Health check (includes MongoDB status)            |

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

### Webhook Security

The server validates webhook signatures using HMAC-SHA256:

- Notion includes `X-Notion-Signature` header with each request
- Server computes expected signature using `NOTION_WEBHOOK_SECRET`
- Requests with invalid signatures are rejected (401)
- Uses timing-safe comparison to prevent timing attacks

**Setup mode**: Before the first token is configured, the server accepts unsigned requests to allow initial verification. Once a token is set, signature validation becomes mandatory.

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
