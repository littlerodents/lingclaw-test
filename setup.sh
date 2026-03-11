#!/usr/bin/env bash
set -e

# =============================================================================
# OpenClaw Panel - Server Setup Script
# Supports: Ubuntu 22.04/24.04, Debian 11/12, CentOS 7/8/9
# =============================================================================

LOG_FILE="/var/log/openclaw-panel-setup.log"
PANEL_DIR="/opt/openclaw-panel"
NPM_REGISTRY="https://registry.npmmirror.com"
GITHUB_PROXY=""  # Set to "https://ghproxy.com/" if needed
NODE_MAJOR=18

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()   { echo -e "${GREEN}[INFO]${NC} $*"  | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"   | tee -a "$LOG_FILE"; }
step()  { echo -e "\n${CYAN}${BOLD}>>> $*${NC}" | tee -a "$LOG_FILE"; }

banner() {
    echo -e "${BOLD}${BLUE}"
    echo "============================================================"
    echo "   OpenClaw Panel - Server Setup"
    echo "   One-Click Initialization Script"
    echo "============================================================"
    echo -e "${NC}"
    echo ""
    log "Log file: $LOG_FILE"
    echo ""
}

fail() {
    err "$1"
    exit 1
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
preflight() {
    step "Pre-flight checks / Preflight"

    if [ "$(id -u)" -ne 0 ]; then
        fail "This script must run as root. Please use: sudo bash setup.sh"
    fi

    # Ensure log dir exists
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
}

# ---------------------------------------------------------------------------
# Detect OS & architecture
# ---------------------------------------------------------------------------
detect_os() {
    step "Detecting OS and architecture / Detecting OS"

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  ARCH_LABEL="amd64" ;;
        aarch64) ARCH_LABEL="arm64" ;;
        armv7l)  ARCH_LABEL="armv7" ;;
        *)       ARCH_LABEL="$ARCH" ;;
    esac

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
        OS_NAME="$PRETTY_NAME"
    elif [ -f /etc/redhat-release ]; then
        OS_ID="centos"
        OS_VERSION=$(rpm -q --queryformat '%{VERSION}' centos-release 2>/dev/null || echo "unknown")
        OS_NAME=$(cat /etc/redhat-release)
    else
        fail "Unable to detect OS. Only Ubuntu/Debian/CentOS are supported."
    fi

    log "OS: $OS_NAME"
    log "Architecture: $ARCH ($ARCH_LABEL)"

    case "$OS_ID" in
        ubuntu|debian) PKG_MANAGER="apt" ;;
        centos|rhel|rocky|alma|fedora) PKG_MANAGER="yum" ;;
        *) fail "Unsupported OS: $OS_ID. Supported: ubuntu, debian, centos, rhel, rocky, alma, fedora" ;;
    esac
}

# ---------------------------------------------------------------------------
# Install base dependencies
# ---------------------------------------------------------------------------
install_base_deps() {
    step "Installing base dependencies / Base deps"

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get update -qq >> "$LOG_FILE" 2>&1
        apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release >> "$LOG_FILE" 2>&1
    else
        yum install -y -q curl wget git ca-certificates >> "$LOG_FILE" 2>&1
    fi
    log "Base dependencies installed."
}

# ---------------------------------------------------------------------------
# Install Node.js 18+ via NodeSource
# ---------------------------------------------------------------------------
install_nodejs() {
    step "Checking Node.js / Node.js"

    if command -v node &>/dev/null; then
        NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VER" -ge "$NODE_MAJOR" ]; then
            log "Node.js $(node -v) already installed. Skipping."
            return
        else
            warn "Node.js $(node -v) found but version < $NODE_MAJOR. Installing newer version..."
        fi
    fi

    log "Installing Node.js $NODE_MAJOR via NodeSource..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
            | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true

        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
            > /etc/apt/sources.list.d/nodesource.list

        apt-get update -qq >> "$LOG_FILE" 2>&1
        apt-get install -y -qq nodejs >> "$LOG_FILE" 2>&1
    else
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_MAJOR}.x | bash - >> "$LOG_FILE" 2>&1
        yum install -y -q nodejs >> "$LOG_FILE" 2>&1
    fi

    log "Node.js $(node -v) installed."
}

# ---------------------------------------------------------------------------
# Install pnpm
# ---------------------------------------------------------------------------
install_pnpm() {
    step "Checking pnpm / pnpm"

    if command -v pnpm &>/dev/null; then
        log "pnpm $(pnpm -v) already installed. Skipping."
        return
    fi

    log "Installing pnpm..."
    npm install -g pnpm --registry "$NPM_REGISTRY" >> "$LOG_FILE" 2>&1
    log "pnpm $(pnpm -v) installed."
}

# ---------------------------------------------------------------------------
# Install OpenClaw CLI
# ---------------------------------------------------------------------------
install_openclaw_cli() {
    step "Checking OpenClaw CLI / OpenClaw CLI"

    if command -v openclaw &>/dev/null; then
        log "OpenClaw CLI already installed. Skipping."
        return
    fi

    log "Installing openclaw-china from npmmirror..."
    npm install -g openclaw-china --registry "$NPM_REGISTRY" >> "$LOG_FILE" 2>&1
    log "OpenClaw CLI installed."
}

# ---------------------------------------------------------------------------
# Deploy panel project
# ---------------------------------------------------------------------------
deploy_panel() {
    step "Deploying panel project to $PANEL_DIR / Deploy panel"

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ -d "$PANEL_DIR" ]; then
        warn "$PANEL_DIR already exists. Updating files..."
        # Preserve .env files if they exist
        if [ -f "$PANEL_DIR/backend/.env" ]; then
            cp "$PANEL_DIR/backend/.env" /tmp/_openclaw_backend_env_backup
        fi
    fi

    mkdir -p "$PANEL_DIR"

    # Copy project files (exclude node_modules, dist, .git)
    rsync -a --exclude='node_modules' --exclude='dist' --exclude='.git' \
        "$SCRIPT_DIR/" "$PANEL_DIR/" >> "$LOG_FILE" 2>&1 || {
        # Fallback if rsync is not available
        cp -r "$SCRIPT_DIR"/* "$PANEL_DIR/" 2>/dev/null || true
        rm -rf "$PANEL_DIR/node_modules" 2>/dev/null || true
    }

    # Restore .env if backed up
    if [ -f /tmp/_openclaw_backend_env_backup ]; then
        cp /tmp/_openclaw_backend_env_backup "$PANEL_DIR/backend/.env"
        rm -f /tmp/_openclaw_backend_env_backup
    fi

    log "Panel files deployed to $PANEL_DIR"

    # Install dependencies
    log "Installing backend dependencies..."
    cd "$PANEL_DIR/backend"
    if [ -f package.json ]; then
        pnpm install --registry "$NPM_REGISTRY" >> "$LOG_FILE" 2>&1
        log "Backend dependencies installed."
    else
        warn "No backend/package.json found. Skipping backend install."
    fi

    log "Installing frontend dependencies..."
    cd "$PANEL_DIR/frontend"
    if [ -f package.json ]; then
        pnpm install --registry "$NPM_REGISTRY" >> "$LOG_FILE" 2>&1
        log "Frontend dependencies installed."
    else
        warn "No frontend/package.json found. Skipping frontend install."
    fi

    # Build frontend
    log "Building frontend..."
    if [ -f package.json ]; then
        pnpm build >> "$LOG_FILE" 2>&1 && log "Frontend built successfully." || warn "Frontend build skipped or failed. Check logs."
    fi

    cd "$SCRIPT_DIR"
}

# ---------------------------------------------------------------------------
# Install systemd service
# ---------------------------------------------------------------------------
install_service() {
    step "Installing systemd service / systemd service"

    SERVICE_SRC="$PANEL_DIR/openclaw-panel.service"
    SERVICE_DST="/etc/systemd/system/openclaw-panel.service"

    if [ ! -f "$SERVICE_SRC" ]; then
        warn "Service file not found at $SERVICE_SRC. Creating from template..."
        cat > "$SERVICE_SRC" << 'SVCEOF'
[Unit]
Description=OpenClaw Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/openclaw-panel/backend
ExecStart=/usr/bin/env npx tsx src/server.ts
Environment=NODE_ENV=production
Environment=OPENCLAW_PANEL_HOST=0.0.0.0
Environment=OPENCLAW_PANEL_PORT=3187
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openclaw-panel

[Install]
WantedBy=multi-user.target
SVCEOF
    fi

    cp "$SERVICE_SRC" "$SERVICE_DST"
    systemctl daemon-reload
    systemctl enable openclaw-panel >> "$LOG_FILE" 2>&1
    systemctl start openclaw-panel >> "$LOG_FILE" 2>&1 || warn "Service start failed. This is normal if backend code is not yet written."

    log "systemd service installed and enabled."
}

# ---------------------------------------------------------------------------
# Install 1Panel (optional)
# ---------------------------------------------------------------------------
install_1panel() {
    step "1Panel installation / 1Panel"

    if command -v 1pctl &>/dev/null || [ -d /opt/1panel ]; then
        log "1Panel already installed. Skipping."
        return
    fi

    echo ""
    echo -e "${YELLOW}1Panel is a modern Linux server management panel.${NC}"
    echo -e "${YELLOW}It provides web UI for managing Nginx, Docker, databases, etc.${NC}"
    echo ""
    read -r -p "$(echo -e "${BOLD}Install 1Panel? [Y/n]:${NC} ")" INSTALL_1PANEL
    INSTALL_1PANEL="${INSTALL_1PANEL:-Y}"

    case "$INSTALL_1PANEL" in
        [yY]|[yY][eE][sS])
            log "Installing 1Panel..."
            curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o /tmp/1panel_install.sh
            bash /tmp/1panel_install.sh >> "$LOG_FILE" 2>&1 || {
                warn "1Panel installation had issues. You may need to install it manually."
                warn "Manual install: curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh | bash"
                return
            }
            rm -f /tmp/1panel_install.sh
            log "1Panel installed."
            ;;
        *)
            log "Skipping 1Panel installation."
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Configure Nginx reverse proxy
# ---------------------------------------------------------------------------
configure_reverse_proxy() {
    step "Configuring reverse proxy / Reverse proxy"

    NGINX_CONF_SRC="$PANEL_DIR/scripts/nginx-openclaw.conf"

    if [ ! -f "$NGINX_CONF_SRC" ]; then
        warn "Nginx config not found at $NGINX_CONF_SRC. Skipping reverse proxy config."
        return
    fi

    # Try common Nginx config locations
    NGINX_CONF_DIRS=(
        "/etc/nginx/conf.d"
        "/opt/1panel/apps/openresty/openresty/conf/conf.d"
        "/www/server/nginx/conf/conf.d"
    )

    INSTALLED=false
    for dir in "${NGINX_CONF_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            cp "$NGINX_CONF_SRC" "$dir/openclaw-panel.conf"
            log "Nginx config copied to $dir/openclaw-panel.conf"
            INSTALLED=true
            break
        fi
    done

    if [ "$INSTALLED" = false ]; then
        warn "No Nginx config directory found. Copy manually:"
        warn "  cp $NGINX_CONF_SRC /etc/nginx/conf.d/openclaw-panel.conf"
        warn "Or include it in your 1Panel site configuration."
    fi

    # Reload nginx if running
    if command -v nginx &>/dev/null && systemctl is-active --quiet nginx; then
        nginx -t >> "$LOG_FILE" 2>&1 && systemctl reload nginx >> "$LOG_FILE" 2>&1
        log "Nginx reloaded."
    elif command -v openresty &>/dev/null && systemctl is-active --quiet openresty; then
        openresty -t >> "$LOG_FILE" 2>&1 && systemctl reload openresty >> "$LOG_FILE" 2>&1
        log "OpenResty reloaded."
    else
        warn "Nginx/OpenResty not running. Remember to reload after configuring."
    fi
}

# ---------------------------------------------------------------------------
# Configure firewall
# ---------------------------------------------------------------------------
configure_firewall() {
    step "Configuring firewall / Firewall"

    PORTS=(8080 18789 3187)
    PORTS_DESC=("1Panel Web UI" "OpenClaw Gateway" "OpenClaw Panel (debug)")

    if command -v ufw &>/dev/null; then
        log "Using ufw firewall..."
        for i in "${!PORTS[@]}"; do
            ufw allow "${PORTS[$i]}/tcp" >> "$LOG_FILE" 2>&1 || true
            log "Opened port ${PORTS[$i]} (${PORTS_DESC[$i]})"
        done
        ufw --force enable >> "$LOG_FILE" 2>&1 || true

    elif command -v firewall-cmd &>/dev/null; then
        log "Using firewalld..."
        for i in "${!PORTS[@]}"; do
            firewall-cmd --permanent --add-port="${PORTS[$i]}/tcp" >> "$LOG_FILE" 2>&1 || true
            log "Opened port ${PORTS[$i]} (${PORTS_DESC[$i]})"
        done
        firewall-cmd --reload >> "$LOG_FILE" 2>&1 || true

    elif command -v iptables &>/dev/null; then
        log "Using iptables..."
        for i in "${!PORTS[@]}"; do
            iptables -A INPUT -p tcp --dport "${PORTS[$i]}" -j ACCEPT 2>> "$LOG_FILE" || true
            log "Opened port ${PORTS[$i]} (${PORTS_DESC[$i]})"
        done

    else
        warn "No firewall tool detected. Make sure these ports are open:"
        for i in "${!PORTS[@]}"; do
            warn "  - ${PORTS[$i]} (${PORTS_DESC[$i]})"
        done
    fi

    # Also check cloud provider firewall reminder
    echo ""
    warn "REMINDER: If using a cloud provider (Alibaba Cloud, Tencent Cloud, AWS, etc.),"
    warn "you must ALSO open these ports in your cloud security group / firewall rules."
}

# ---------------------------------------------------------------------------
# Print summary
# ---------------------------------------------------------------------------
print_summary() {
    # Get server IP
    SERVER_IP=$(curl -s --max-time 5 ip.sb 2>/dev/null || \
                curl -s --max-time 5 ifconfig.me 2>/dev/null || \
                hostname -I 2>/dev/null | awk '{print $1}' || \
                echo "YOUR_IP")

    echo ""
    echo -e "${GREEN}${BOLD}============================================================${NC}"
    echo -e "${GREEN}${BOLD}   Installation Complete!${NC}"
    echo -e "${GREEN}${BOLD}============================================================${NC}"
    echo ""
    echo -e "  ${BOLD}Access Info:${NC}"
    echo -e "  - 1Panel:         ${CYAN}http://${SERVER_IP}:8080${NC}"
    echo -e "  - OpenClaw Panel: ${CYAN}http://${SERVER_IP}:8080/openclaw${NC} (via 1Panel reverse proxy)"
    echo -e "  - Direct Access:  ${CYAN}http://${SERVER_IP}:3187${NC} (debug only)"
    echo ""
    echo -e "  ${BOLD}Default Credentials:${NC}"
    echo -e "  - 1Panel default user: ${YELLOW}admin${NC}"
    echo ""
    echo -e "  ${BOLD}Important Paths:${NC}"
    echo -e "  - OpenClaw config:  ${CYAN}~/.openclaw/${NC}"
    echo -e "  - Panel directory:  ${CYAN}${PANEL_DIR}/${NC}"
    echo -e "  - Setup log:        ${CYAN}${LOG_FILE}${NC}"
    echo ""
    echo -e "  ${BOLD}Service Management:${NC}"
    echo -e "  - Status:   ${CYAN}systemctl status openclaw-panel${NC}"
    echo -e "  - Restart:  ${CYAN}systemctl restart openclaw-panel${NC}"
    echo -e "  - Logs:     ${CYAN}journalctl -u openclaw-panel -f${NC}"
    echo ""
    echo -e "${GREEN}${BOLD}============================================================${NC}"
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    banner
    preflight
    detect_os
    install_base_deps
    install_nodejs
    install_pnpm
    install_openclaw_cli
    deploy_panel
    install_service
    install_1panel
    configure_reverse_proxy
    configure_firewall
    print_summary
}

main "$@"
