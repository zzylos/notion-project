# Deployment Guide

This directory contains configuration files for deploying the Notion Opportunity Tree Visualizer with nginx.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│                    (Port 80/443)                            │
├─────────────────────────────────────────────────────────────┤
│  /              → Static files (dist/)                      │
│  /api/*         → Proxy to backend :3001                    │
│  /api/webhook   → Proxy (no rate limit)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                            │
│                     (Port 3001)                             │
│  - Express.js                                               │
│  - MongoDB connection                                        │
│  - Notion API integration                                   │
│  - Real-time webhooks                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB                                 │
│              (Atlas or self-hosted)                         │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Description |
|------|-------------|
| `deploy.sh` | Automated deployment script |
| `nginx/notion-tree.conf` | Nginx site configuration |
| `systemd/notion-tree.service` | Systemd service for backend |
| `.env.production.example` | Production environment template |

## Quick Start

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Node.js 20+
- Nginx
- MongoDB (Atlas recommended)
- Domain name (optional, but recommended)

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install certbot for SSL (optional)
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Configure Environment

```bash
# Create application directory
sudo mkdir -p /var/www/notion-tree

# Copy environment template
sudo cp deploy/.env.production.example /var/www/notion-tree/.env

# Edit with your credentials
sudo nano /var/www/notion-tree/.env
```

Required configuration:
- `MONGODB_URI` - Your MongoDB connection string
- `VITE_NOTION_API_KEY` - Your Notion integration API key
- `VITE_NOTION_DB_*` - Your Notion database IDs
- `CORS_ORIGIN` - Your domain (e.g., https://your-domain.com)
- `VITE_API_URL` - Your domain for API calls

### Step 3: Deploy

```bash
# Run deployment script
sudo ./deploy/deploy.sh
```

The script will:
1. Install npm dependencies
2. Build frontend and backend
3. Deploy to `/var/www/notion-tree`
4. Configure nginx and systemd
5. Start services

### Step 4: Configure Domain

Edit the nginx config with your domain:

```bash
sudo nano /etc/nginx/sites-available/notion-tree.conf
```

Replace `your-domain.com` with your actual domain.

```bash
# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Enable SSL (Recommended)

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure nginx
```

## Manual Deployment

If you prefer not to use the deployment script:

### Build

```bash
# Frontend
npm ci
npm run build

# Backend
cd server
npm ci
npm run build
```

### Deploy Files

```bash
# Create directories
sudo mkdir -p /var/www/notion-tree/{dist,server/dist}

# Copy files (shared/ is compiled into server/dist/)
sudo cp -r dist/* /var/www/notion-tree/dist/
sudo cp -r server/dist/* /var/www/notion-tree/server/dist/
sudo cp server/package*.json /var/www/notion-tree/server/

# Install production dependencies
cd /var/www/notion-tree/server
sudo npm ci --production

# Set permissions
sudo chown -R www-data:www-data /var/www/notion-tree
```

### Configure Nginx

```bash
sudo cp deploy/nginx/notion-tree.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/notion-tree.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Configure Systemd

```bash
sudo cp deploy/systemd/notion-tree.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable notion-tree
sudo systemctl start notion-tree
```

## Management Commands

```bash
# View backend logs
sudo journalctl -u notion-tree -f

# Restart backend
sudo systemctl restart notion-tree

# Check status
sudo systemctl status notion-tree

# Health check
curl http://localhost:3001/api/health

# Force data sync
curl -X POST http://localhost:3001/api/items/sync
```

## Updating

To deploy updates:

```bash
cd /path/to/notion-project
git pull
sudo ./deploy/deploy.sh
```

Or skip certain steps:

```bash
# Skip dependency installation
sudo ./deploy/deploy.sh --skip-deps

# Skip build (deploy pre-built files)
sudo ./deploy/deploy.sh --skip-build
```

## Troubleshooting

### Backend won't start

Check logs:
```bash
sudo journalctl -u notion-tree -n 100
```

Common issues:
- MongoDB connection failed - check `MONGODB_URI`
- Port 3001 in use - check with `lsof -i :3001`
- Missing environment variables

### Nginx 502 Bad Gateway

Backend isn't running:
```bash
sudo systemctl status notion-tree
sudo systemctl restart notion-tree
```

### Notion API errors

- Verify `VITE_NOTION_API_KEY` is correct
- Ensure databases are shared with your integration
- Check database IDs are correct (use 32-char format with dashes)

### Webhooks not working

1. Ensure server is publicly accessible
2. Check `NOTION_WEBHOOK_SECRET` matches Notion's token
3. Verify webhook URL in Notion integration settings
