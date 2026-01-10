# Shared VPS Deployment Guide

This guide covers deploying the Notion Opportunity Tree Visualizer to a shared VPS under a subdirectory (e.g., `https://jobs1.fangintel.com/notionvisualizer/`).

## Architecture

```
Browser
    │
    ├── /notionvisualizer/ui/     → Static files (Vite build)
    ├── /notionvisualizer/api/    → Backend API (proxied to :3001)
    └── /notionvisualizer/webhook/→ Notion webhooks (proxied to :3001)
    │
    ▼
Nginx (port 443)
    │
    ├── Static files: /var/www/notionvisualizer/dist/
    └── Proxy to: http://127.0.0.1:3001
    │
    ▼
Node.js Backend (port 3001)
    │
    └── MongoDB (external)
```

## Prerequisites

- Node.js 18+ on the VPS
- MongoDB database (MongoDB Atlas recommended)
- Notion Integration with API key
- SSH access to VPS
- Existing nginx server configuration

## Step 1: Prepare the VPS

```bash
# SSH into your VPS
ssh user@jobs1.fangintel.com

# Create application directory
sudo mkdir -p /var/www/notionvisualizer
sudo chown www-data:www-data /var/www/notionvisualizer

# Ensure Node.js is installed
node --version  # Should be 18+
```

## Step 2: Build and Deploy Files

On your local machine:

```bash
cd notion-project

# Copy the example env and configure it
cp deploy/.env.shared-vps.example .env.production

# Edit .env.production with your actual values:
# - MONGODB_URI
# - VITE_NOTION_API_KEY
# - VITE_NOTION_DB_* (your database IDs)

# Build frontend with subdirectory base path
VITE_BASE_PATH=/notionvisualizer/ui/ \
VITE_API_URL=https://jobs1.fangintel.com/notionvisualizer \
VITE_DISABLE_CONFIG_UI=true \
npm run build

# Build backend
npm run build:server

# Deploy to VPS (adjust user@host as needed)
rsync -avz --delete dist/ user@jobs1.fangintel.com:/var/www/notionvisualizer/dist/
rsync -avz --delete server/dist/ user@jobs1.fangintel.com:/var/www/notionvisualizer/server/dist/
rsync -avz server/package*.json user@jobs1.fangintel.com:/var/www/notionvisualizer/server/
rsync -avz shared/ user@jobs1.fangintel.com:/var/www/notionvisualizer/shared/
scp .env.production user@jobs1.fangintel.com:/var/www/notionvisualizer/.env
```

## Step 3: Install Backend Dependencies on VPS

```bash
ssh user@jobs1.fangintel.com

cd /var/www/notionvisualizer/server
npm install --production

# Verify the build
ls dist/server/src/index.js  # Should exist
```

## Step 4: Configure Nginx

Add the upstream block to your nginx http context (usually `/etc/nginx/nginx.conf`):

```nginx
# Add to http {} block if not already present
upstream notion_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}
```

Replace your existing notion sections in your server block with:

```nginx
# --- Notion Visualizer Frontend ---
location = /notionvisualizer {
    return 301 /notionvisualizer/ui/;
}

location = /notionvisualizer/ {
    return 301 /notionvisualizer/ui/;
}

location /notionvisualizer/ui/ {
    alias /var/www/notionvisualizer/dist/;
    index index.html;

    # Static assets caching
    location ~* ^/notionvisualizer/ui/assets/.*\.(js|css|woff2?|ttf|eot)$ {
        alias /var/www/notionvisualizer/dist/;
        rewrite ^/notionvisualizer/ui/(.*)$ /$1 break;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* ^/notionvisualizer/ui/.*\.(ico|png|jpg|jpeg|gif|svg|webp)$ {
        alias /var/www/notionvisualizer/dist/;
        rewrite ^/notionvisualizer/ui/(.*)$ /$1 break;
        expires 30d;
        add_header Cache-Control "public";
    }

    # SPA fallback
    try_files $uri $uri/ /notionvisualizer/ui/index.html;
}

# --- Notion Visualizer API ---
location /notionvisualizer/api/ {
    rewrite ^/notionvisualizer/api/(.*)$ /api/$1 break;

    proxy_pass http://notion_backend;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# --- Notion Webhook Endpoint ---
location = /notionvisualizer/webhook {
    return 301 /notionvisualizer/webhook/;
}

location /notionvisualizer/webhook/ {
    rewrite ^/notionvisualizer/webhook/?(.*)$ /api/webhook/$1 break;

    proxy_pass http://notion_backend;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";

    proxy_read_timeout 120s;
}

# --- Health Check ---
location = /notionvisualizer/health {
    rewrite ^/notionvisualizer/health$ /api/health break;
    proxy_pass http://notion_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Set Up Systemd Service

```bash
# Copy the service file
sudo cp /var/www/notionvisualizer/deploy/systemd/notion-tree-shared-vps.service \
    /etc/systemd/system/notion-tree.service

# Or create it manually:
sudo nano /etc/systemd/system/notion-tree.service
```

Service file content:

```ini
[Unit]
Description=Notion Opportunity Tree Visualizer Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/notionvisualizer/server

EnvironmentFile=/var/www/notionvisualizer/.env
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin

ExecStart=/usr/bin/node dist/server/src/index.js

Restart=on-failure
RestartSec=10
StartLimitBurst=5
StartLimitIntervalSec=60

LimitNOFILE=65536
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/www/notionvisualizer

TimeoutStopSec=15
KillMode=mixed
KillSignal=SIGTERM

StandardOutput=journal
StandardError=journal
SyslogIdentifier=notion-tree

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable notion-tree
sudo systemctl start notion-tree
sudo systemctl status notion-tree
```

## Step 6: Verify Deployment

```bash
# Check backend health
curl https://jobs1.fangintel.com/notionvisualizer/health

# Check API
curl https://jobs1.fangintel.com/notionvisualizer/api/health

# View logs
sudo journalctl -u notion-tree -f
```

Visit `https://jobs1.fangintel.com/notionvisualizer/` in your browser.

## Step 7: Configure Notion Webhooks (Optional)

For real-time updates from Notion:

1. Go to [Notion Integrations](https://www.notion.so/profile/integrations)
2. Select your integration → Webhooks tab
3. Create subscription with URL: `https://jobs1.fangintel.com/notionvisualizer/webhook/`
4. Subscribe to events: `page.content_updated`, `page.created`, `page.deleted`, `page.moved`
5. Copy the verification token from server logs:
   ```bash
   sudo journalctl -u notion-tree | grep "verification token"
   ```
6. Add to `.env` and restart:
   ```bash
   echo "NOTION_WEBHOOK_SECRET=secret_xxx" >> /var/www/notionvisualizer/.env
   sudo systemctl restart notion-tree
   ```

## Troubleshooting

### Backend not starting

```bash
# Check logs
sudo journalctl -u notion-tree -n 50

# Common issues:
# - MongoDB connection failed: Check MONGODB_URI
# - Port already in use: Check PORT setting
# - Permission denied: Check file ownership
```

### 502 Bad Gateway

```bash
# Verify backend is running
curl http://127.0.0.1:3001/api/health

# If not running, check logs
sudo journalctl -u notion-tree -f
```

### Static files not loading

```bash
# Verify files exist
ls -la /var/www/notionvisualizer/dist/

# Check nginx can read them
sudo -u www-data ls /var/www/notionvisualizer/dist/

# Verify nginx config
sudo nginx -t
```

### API returning 404

```bash
# Test directly to backend
curl http://127.0.0.1:3001/api/items

# Check nginx proxy config
nginx -T | grep -A 20 "notionvisualizer/api"
```

## Updating the Application

```bash
# On local machine
npm run build
npm run build:server

# Deploy
rsync -avz --delete dist/ user@host:/var/www/notionvisualizer/dist/
rsync -avz --delete server/dist/ user@host:/var/www/notionvisualizer/server/dist/

# On VPS
sudo systemctl restart notion-tree
```

## Complete Nginx Configuration Reference

See `deploy/nginx/notion-tree-shared-vps.conf` for the complete configuration with all location blocks and comments.
