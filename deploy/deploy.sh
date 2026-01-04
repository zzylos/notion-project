#!/bin/bash
# Notion Opportunity Tree Visualizer - Deployment Script
# Usage: ./deploy.sh [--skip-build] [--skip-deps]

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

APP_NAME="notion-tree"
APP_DIR="/var/www/${APP_NAME}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}.conf"
SYSTEMD_SERVICE="/etc/systemd/system/${APP_NAME}.service"
NODE_VERSION="20"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
    fi
}

# =============================================================================
# Parse Arguments
# =============================================================================

SKIP_BUILD=false
SKIP_DEPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

# =============================================================================
# Pre-flight Checks
# =============================================================================

log_info "Running pre-flight checks..."

check_root

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js ${NODE_VERSION}+"
fi

NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_CURRENT -lt $NODE_VERSION ]]; then
    log_warn "Node.js version ${NODE_CURRENT} detected. Recommended: ${NODE_VERSION}+"
fi

# Check nginx
if ! command -v nginx &> /dev/null; then
    log_error "Nginx is not installed. Run: apt install nginx"
fi

# Check environment file
if [[ ! -f "${APP_DIR}/.env" ]]; then
    log_warn "Environment file not found at ${APP_DIR}/.env"
    log_info "Creating from template..."
    mkdir -p "${APP_DIR}"
    cp "${REPO_DIR}/deploy/.env.production.example" "${APP_DIR}/.env"
    log_error "Please edit ${APP_DIR}/.env with your credentials, then re-run this script"
fi

log_success "Pre-flight checks passed"

# =============================================================================
# Install Dependencies
# =============================================================================

if [[ "$SKIP_DEPS" == false ]]; then
    log_info "Installing dependencies..."

    cd "${REPO_DIR}"
    npm ci --production=false

    cd "${REPO_DIR}/server"
    npm ci --production=false

    log_success "Dependencies installed"
else
    log_info "Skipping dependency installation"
fi

# =============================================================================
# Build Application
# =============================================================================

if [[ "$SKIP_BUILD" == false ]]; then
    log_info "Building application..."

    cd "${REPO_DIR}"

    # Source production env for frontend build
    set -a
    source "${APP_DIR}/.env"
    set +a

    # Build frontend
    log_info "Building frontend..."
    npm run build

    # Build backend
    log_info "Building backend..."
    npm run build:server

    log_success "Build complete"
else
    log_info "Skipping build"
fi

# =============================================================================
# Deploy Files
# =============================================================================

log_info "Deploying files..."

# Create app directory structure
mkdir -p "${APP_DIR}"/{dist,server/dist}

# Copy frontend build
rsync -av --delete "${REPO_DIR}/dist/" "${APP_DIR}/dist/"

# Copy backend build
rsync -av --delete "${REPO_DIR}/server/dist/" "${APP_DIR}/server/dist/"

# Copy package files for backend
cp "${REPO_DIR}/server/package.json" "${APP_DIR}/server/"
cp "${REPO_DIR}/server/package-lock.json" "${APP_DIR}/server/" 2>/dev/null || true

# Copy shared directory
rsync -av --delete "${REPO_DIR}/shared/" "${APP_DIR}/shared/"

# Install production dependencies in deployment directory
cd "${APP_DIR}/server"
npm ci --production

# Set ownership
chown -R www-data:www-data "${APP_DIR}"

log_success "Files deployed to ${APP_DIR}"

# =============================================================================
# Configure Nginx
# =============================================================================

log_info "Configuring nginx..."

# Copy nginx config
cp "${REPO_DIR}/deploy/nginx/notion-tree.conf" "${NGINX_CONF}"

# Create symlink if not exists
if [[ ! -L "/etc/nginx/sites-enabled/${APP_NAME}.conf" ]]; then
    ln -s "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
fi

# Test nginx config
if nginx -t 2>&1; then
    log_success "Nginx configuration valid"
else
    log_error "Nginx configuration test failed"
fi

# =============================================================================
# Configure Systemd Service
# =============================================================================

log_info "Configuring systemd service..."

# Copy service file
cp "${REPO_DIR}/deploy/systemd/notion-tree.service" "${SYSTEMD_SERVICE}"

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable "${APP_NAME}"

log_success "Systemd service configured"

# =============================================================================
# Start/Restart Services
# =============================================================================

log_info "Starting services..."

# Restart backend
if systemctl is-active --quiet "${APP_NAME}"; then
    log_info "Restarting ${APP_NAME} service..."
    systemctl restart "${APP_NAME}"
else
    log_info "Starting ${APP_NAME} service..."
    systemctl start "${APP_NAME}"
fi

# Wait for backend to be ready
log_info "Waiting for backend to start..."
sleep 3

if systemctl is-active --quiet "${APP_NAME}"; then
    log_success "Backend service is running"
else
    log_error "Backend service failed to start. Check: journalctl -u ${APP_NAME}"
fi

# Reload nginx
log_info "Reloading nginx..."
systemctl reload nginx

log_success "Nginx reloaded"

# =============================================================================
# Health Check
# =============================================================================

log_info "Running health check..."

sleep 2

if curl -sf http://localhost:3001/api/health > /dev/null; then
    log_success "Backend health check passed"
else
    log_warn "Backend health check failed - service may still be starting"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=============================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Application deployed to: ${APP_DIR}"
echo "Frontend: http://your-domain.com"
echo "Backend:  http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  - View logs:    journalctl -u ${APP_NAME} -f"
echo "  - Restart:      systemctl restart ${APP_NAME}"
echo "  - Status:       systemctl status ${APP_NAME}"
echo "  - Health:       curl http://localhost:3001/api/health"
echo ""
echo "Next steps:"
echo "  1. Update ${NGINX_CONF} with your domain name"
echo "  2. Set up SSL with: certbot --nginx -d your-domain.com"
echo "  3. Configure Notion webhooks (see CLAUDE.md)"
echo ""
