#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# BOPET EDA 数据平台 — 生产环境部署脚本 (Linux)
# ═══════════════════════════════════════════════════════════════
# 用法:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh              # 构建 + 启动
#   ./scripts/deploy.sh --update     # 拉取 git + 构建 + 重启
#   ./scripts/deploy.sh --restart    # 仅重启
#   ./scripts/deploy.sh --stop       # 停止服务
#   ./scripts/deploy.sh --logs       # 查看日志
#   ./scripts/deploy.sh --status     # 查看状态
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── 配置 ──────────────────────────────────────────
APP_NAME="bopet-eda"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="22"          # 推荐 Node.js 版本
PORT=3100

cd "$PROJECT_DIR"

# ── 颜色输出 ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ── 环境检查 ──────────────────────────────────────
check_env() {
  info "检查运行环境..."

  # Node.js
  if ! command -v node &>/dev/null; then
    err "未找到 Node.js，请先安装 Node.js ${NODE_VERSION}+"
    exit 1
  fi
  local node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$node_ver" -lt 18 ]; then
    err "Node.js 版本过低 (需要 18+)，当前: $(node -v)"
    exit 1
  fi
  log "Node.js $(node -v)"

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    warn "未找到 pnpm，正在安装..."
    npm install -g pnpm
  fi
  log "pnpm $(pnpm -v)"

  # PM2
  if ! command -v pm2 &>/dev/null; then
    warn "未找到 PM2，正在安装..."
    npm install -g pm2
  fi
  log "PM2 $(pm2 -v)"

  # 确保 data 目录存在
  mkdir -p "$PROJECT_DIR/data"
  mkdir -p "$PROJECT_DIR/logs"
}

# ── 安装依赖 ──────────────────────────────────────
install_deps() {
  info "安装项目依赖..."
  pnpm install --frozen-lockfile --prod=false
  log "依赖安装完成"
}

# ── 构建项目 ──────────────────────────────────────
build_project() {
  info "构建项目 (含 Prisma 生成 + 数据库推送 + 种子数据 + Nuxt 构建)..."
  pnpm run build
  log "构建完成"
}

# ── 启动 / 重启服务 ───────────────────────────────
start_service() {
  if pm2 list | grep -q "$APP_NAME"; then
    info "重启 ${APP_NAME}..."
    pm2 restart ecosystem.config.cjs --update-env
  else
    info "首次启动 ${APP_NAME}..."
    pm2 start ecosystem.config.cjs
  fi

  # 保存 PM2 进程列表（用于开机自启）
  pm2 save --force

  log "服务已启动 (端口: ${PORT})"
  pm2 status "$APP_NAME"
}

# ── 设置开机自启 ──────────────────────────────────
setup_startup() {
  info "配置 PM2 开机自启..."
  local startup_cmd=$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null | tail -1)
  if [ -n "$startup_cmd" ]; then
    warn "请以 root 权限执行以下命令以启用开机自启:"
    echo "  sudo ${startup_cmd}"
  else
    info "PM2 开机自启已配置"
  fi
}

# ── 主流程 ────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   BOPET EDA 数据平台 — 生产环境部署       ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
  echo ""

  check_env

  case "${1:-}" in
    --update)
      info "模式: Git 更新 + 重新构建 + 重启"
      if [ -d ".git" ]; then
        info "拉取最新代码..."
        git pull origin main 2>/dev/null || warn "Git pull 失败，继续使用当前代码"
      fi
      install_deps
      build_project
      start_service
      setup_startup
      ;;
    --restart)
      info "模式: 仅重启服务"
      start_service
      ;;
    --stop)
      info "模式: 停止服务"
      pm2 stop "$APP_NAME" 2>/dev/null || warn "服务未在运行"
      log "服务已停止"
      ;;
    --logs)
      pm2 logs "$APP_NAME"
      ;;
    --status)
      pm2 status "$APP_NAME"
      ;;
    --setup-startup)
      setup_startup
      ;;
    *)
      # 默认: 构建 + 启动
      install_deps
      build_project
      start_service
      setup_startup
      ;;
  esac

  echo ""
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  部署完成!${NC}"
  echo -e "${GREEN}  访问地址: http://localhost:${PORT}${NC}"
  echo -e "${GREEN}  查看日志: pm2 logs ${APP_NAME}${NC}"
  echo -e "${GREEN}  查看状态: pm2 status${NC}"
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
}

main "$@"
