#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Salary Insights Portal — Production Deployment Script
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh           # Full deploy (build + start)
#   ./deploy.sh --update  # Zero-downtime rolling update
#   ./deploy.sh --down    # Stop all services
#   ./deploy.sh --logs    # Tail logs
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Preflight ──────────────────────────────────────────────────────────────────
check_dependencies() {
    for cmd in docker docker-compose curl; do
        command -v "$cmd" &>/dev/null || err "Required: $cmd not found"
    done
    log "Dependencies OK"
}

check_env() {
    [[ ! -f .env ]] && err ".env file not found — copy .env.example and fill in your values"
    # shellcheck disable=SC1091
    source .env
    [[ -z "${POSTGRES_PASSWORD:-}" || "$POSTGRES_PASSWORD" == "CHANGE_ME"* ]] && \
        err "POSTGRES_PASSWORD not set or still default"
    [[ -z "${JWT_SECRET:-}" || "$JWT_SECRET" == "CHANGE_ME"* ]] && \
        err "JWT_SECRET not set or still default"
    log "Environment OK"
}

# ── Commands ───────────────────────────────────────────────────────────────────
deploy_full() {
    log "Starting full deployment..."

    # Create SSL directory if needed
    mkdir -p deploy/ssl

    # Build and start
    docker-compose pull postgres 2>/dev/null || true
    docker-compose up -d --build --remove-orphans

    log "Waiting for services to become healthy..."
    wait_healthy "salary_postgres"  60
    wait_healthy "salary_backend"   120
    wait_healthy "salary_frontend"  30

    log "${GREEN}✅ Deployment successful!${NC}"
    show_status
}

deploy_update() {
    log "Rolling update..."
    docker-compose up -d --build --no-deps backend frontend
    wait_healthy "salary_backend"  120
    wait_healthy "salary_frontend" 30
    log "${GREEN}✅ Update complete!${NC}"
}

wait_healthy() {
    local container=$1
    local timeout=$2
    local elapsed=0
    printf "  Waiting for %s" "$container"
    while [[ $elapsed -lt $timeout ]]; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
        [[ "$status" == "healthy" ]] && { printf " ${GREEN}✓${NC}\n"; return 0; }
        printf "."
        sleep 3
        elapsed=$((elapsed + 3))
    done
    printf " ${RED}TIMEOUT${NC}\n"
    docker logs "$container" --tail 30
    err "$container did not become healthy in ${timeout}s"
}

show_status() {
    echo ""
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    echo -e "${BLUE}  Salary Insights Portal — Running Services  ${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    docker-compose ps
    echo ""
    local frontend_url="${FRONTEND_URL:-http://localhost}"
    echo -e "  🌐  App:    ${GREEN}${frontend_url}${NC}"
    echo -e "  🔒  Admin:  ${GREEN}${frontend_url}/admin${NC} (admin@salaryinsights.com)"
    echo -e "  📊  Health: ${GREEN}${frontend_url}/api/actuator/health${NC}"
    echo ""
}

# ── Main ───────────────────────────────────────────────────────────────────────
case "${1:-}" in
    --update) check_dependencies; check_env; deploy_update ;;
    --down)   docker-compose down; log "All services stopped" ;;
    --logs)   docker-compose logs -f --tail=100 ;;
    --status) show_status ;;
    "")       check_dependencies; check_env; deploy_full ;;
    *)        err "Unknown option: $1. Use: (no args) | --update | --down | --logs | --status" ;;
esac
