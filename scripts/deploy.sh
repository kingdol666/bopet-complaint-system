#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# BOPET EDA 数据平台 — 阿里云 ECS 公网部署脚本
# ═══════════════════════════════════════════════════════════════════════
#
# 前提条件 (首次部署前在阿里云控制台操作一次):
#   1. 阿里云控制台 → ECS → 安全组 → 入方向 → 添加规则:
#      端口: 3001  协议: TCP  授权对象: 0.0.0.0/0
#   2. 如果 ECS 开启了系统防火墙 (firewalld/ufw)，本脚本会自动放行 3001
#
# 用法:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh              # 完整部署 (安装依赖 + 构建 + 启动)
#   ./scripts/deploy.sh --quick      # 快速更新 (git pull + 构建 + 重启)
#   ./scripts/deploy.sh --restart    # 仅重启
#   ./scripts/deploy.sh --stop       # 停止
#   ./scripts/deploy.sh --logs       # 查看日志
#   ./scripts/deploy.sh --status     # 查看状态
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────
APP_NAME="bopet-eda"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3001
NODE_MIN_VER=18

cd "$PROJECT_DIR"

# ── 颜色 ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BLUE='\033[1;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }
head() { echo -e "${BLUE}$1${NC}"; }

# ── 环境检查 ──────────────────────────────────────────────
check_env() {
  info "检查运行环境..."

  # Node.js
  if ! command -v node &>/dev/null; then
    err "未找到 Node.js，请先安装 Node.js ${NODE_MIN_VER}+"
    echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
  fi
  local node_major=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$node_major" -lt "$NODE_MIN_VER" ]; then
    err "Node.js 版本过低 (需要 ${NODE_MIN_VER}+)，当前: $(node -v)"
    exit 1
  fi
  log "Node.js $(node -v)"

  # npm (检查是否有)
  if ! command -v npm &>/dev/null; then
    err "未找到 npm"
    exit 1
  fi
  log "npm $(npm -v)"

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

  # Git
  if ! command -v git &>/dev/null; then
    warn "未找到 Git (更新功能不可用)"
  else
    log "Git $(git --version | awk '{print $3}')"
  fi

  # 目录
  mkdir -p "$PROJECT_DIR/data"
  mkdir -p "$PROJECT_DIR/logs"
  log "目录就绪"
}

# ── 防火墙配置 ────────────────────────────────────────────
configure_firewall() {
  info "配置防火墙，放行端口 ${PORT}..."

  local need_manual=false

  # firewalld (CentOS / Alibaba Cloud Linux)
  if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
    if ! firewall-cmd --list-ports 2>/dev/null | grep -q "${PORT}/tcp"; then
      sudo firewall-cmd --zone=public --add-port=${PORT}/tcp --permanent 2>/dev/null && \
      sudo firewall-cmd --reload 2>/dev/null && \
      log "firewalld 已放行 ${PORT}/tcp" || need_manual=true
    else
      log "firewalld 已存在 ${PORT}/tcp 规则"
    fi
  fi

  # ufw (Ubuntu / Debian)
  if command -v ufw &>/dev/null && ufw status | grep -q "Status: active" 2>/dev/null; then
    if ! ufw status | grep -q "${PORT}/tcp"; then
      sudo ufw allow ${PORT}/tcp 2>/dev/null && \
      log "ufw 已放行 ${PORT}/tcp" || need_manual=true
    else
      log "ufw 已存在 ${PORT}/tcp 规则"
    fi
  fi

  # iptables (fallback)
  if ! command -v firewall-cmd &>/dev/null && ! command -v ufw &>/dev/null; then
    if ! sudo iptables -C INPUT -p tcp --dport ${PORT} -j ACCEPT 2>/dev/null; then
      sudo iptables -I INPUT -p tcp --dport ${PORT} -j ACCEPT 2>/dev/null && \
      log "iptables 已放行 ${PORT}/tcp" || need_manual=true
    fi
  fi
}

# ── 安装依赖 ──────────────────────────────────────────────
install_deps() {
  info "安装项目依赖..."
  pnpm install --frozen-lockfile --prod=false
  log "依赖安装完成"
}

# ── 构建项目 ──────────────────────────────────────────────
build_project() {
  info "构建项目..."

  # Ensure data directory exists before any DB operations
  info "  0) 创建数据目录..."
  mkdir -p "$PROJECT_DIR/data"

  info "  1) 准备 Prisma Schema..."
  npm run prisma:prepare

  info "  2) 生成 Prisma Client..."
  npx prisma generate

  info "  3) 推送数据库 Schema (自动创建 data/bopet.db)..."
  npx prisma db push

  info "  4) 写入种子数据..."
  npm run db:seed

  info "  5) Nuxt 生产构建..."
  npx nuxt build

  log "构建完成"
}

# ── 启动服务 ──────────────────────────────────────────────
start_service() {
  if pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
    info "重启 ${APP_NAME}..."
    pm2 restart ecosystem.config.cjs --update-env
  else
    info "首次启动 ${APP_NAME}..."
    pm2 start ecosystem.config.cjs
  fi

  pm2 save --force
  log "服务已启动"
  sleep 2
  pm2 status "$APP_NAME"
}

# ── 开机自启 ──────────────────────────────────────────────
setup_startup() {
  info "配置 PM2 开机自启..."
  local startup_cmd
  startup_cmd=$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null | tail -1) || true
  if echo "$startup_cmd" | grep -q "sudo"; then
    warn "请手动执行以下命令以启用开机自启:"
    echo -e "  ${YELLOW}${startup_cmd}${NC}"
  else
    log "PM2 开机自启已配置"
  fi
}

# ── 获取公网 IP ───────────────────────────────────────────
show_access_info() {
  local public_ip=""
  # 尝试多种方式获取公网 IP
  public_ip=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null \
    || curl -s --connect-timeout 3 ip.sb 2>/dev/null \
    || curl -s --connect-timeout 3 http://100.100.100.200/latest/meta-data/eipv4 2>/dev/null \
    || curl -s --connect-timeout 3 http://100.100.100.200/latest/meta-data/public-ipv4 2>/dev/null \
    || echo "")

  echo ""
  head "══════════════════════════════════════════════"
  head "  BOPET EDA 部署完成!"
  head "══════════════════════════════════════════════"
  if [ -n "$public_ip" ]; then
    log "公网访问: http://${public_ip}:${PORT}"
  else
    log "内网访问: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):${PORT}"
  fi
  log "查看状态: pm2 status"
  log "查看日志: pm2 logs ${APP_NAME}"
  log "实时监控: pm2 monit"
  echo ""
  warn "重要提醒: 请确保阿里云安全组已放行 ${PORT} 端口!"
  echo -e "  ${CYAN}阿里云控制台 → ECS → 安全组 → 入方向 → 添加规则${NC}"
  echo -e "  ${CYAN}端口: ${PORT}  协议: TCP  授权对象: 0.0.0.0/0${NC}"
  echo ""
}

# ── 安全组提醒 ────────────────────────────────────────────
show_security_group_notice() {
  echo ""
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  阿里云安全组配置 (必须操作!)                       ║${NC}"
  echo -e "${YELLOW}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${YELLOW}║  1. 登录阿里云控制台                                 ║${NC}"
  echo -e "${YELLOW}║  2. ECS → 实例 → 更多 → 网络和安全组 → 安全组配置   ║${NC}"
  echo -e "${YELLOW}║  3. 入方向 → 手动添加                                ║${NC}"
  echo -e "${YELLOW}║     端口: ${PORT}                                        ║${NC}"
  echo -e "${YELLOW}║     协议: TCP                                        ║${NC}"
  echo -e "${YELLOW}║     授权对象: 0.0.0.0/0                              ║${NC}"
  echo -e "${YELLOW}║     描述: BOPET EDA Web                             ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── 主入口 ────────────────────────────────────────────────
main() {
  echo ""
  head "╔══════════════════════════════════════════════╗"
  head "║   BOPET EDA 数据平台 — 阿里云 ECS 部署      ║"
  head "║   端口: ${PORT}  ·  绑定: 0.0.0.0              ║"
  head "╚══════════════════════════════════════════════╝"
  echo ""

  check_env
  configure_firewall

  case "${1:-}" in
    --quick)
      head "模式: 快速更新 (git pull + 构建 + 重启)"
      if command -v git &>/dev/null && [ -d ".git" ]; then
        info "拉取最新代码..."
        git pull origin main 2>/dev/null || warn "Git pull 失败"
      fi
      install_deps
      build_project
      start_service
      setup_startup
      show_access_info
      ;;
    --restart)
      head "模式: 仅重启"
      start_service
      show_access_info
      ;;
    --stop)
      head "模式: 停止服务"
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
    --security-group)
      show_security_group_notice
      ;;
    *)
      # 默认: 完整部署
      head "模式: 完整部署"
      show_security_group_notice
      sleep 3
      install_deps
      build_project
      start_service
      setup_startup
      show_access_info
      ;;
  esac
}

main "$@"
