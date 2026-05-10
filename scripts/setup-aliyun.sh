#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# 阿里云 ECS 首次环境初始化脚本
# 在全新 ECS 实例上执行一次，安装所有运行时依赖
# ═══════════════════════════════════════════════════════════════════════
# 用法:
#   chmod +x scripts/setup-aliyun.sh
#   sudo bash scripts/setup-aliyun.sh
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }
head() { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }

PORT=3001

# ── 检测系统 ──────────────────────────────────────────────
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
  else
    OS="unknown"
  fi
  echo "系统: $OS $OS_VERSION"
}

# ── 更新系统包 ────────────────────────────────────────────
update_system() {
  head "更新系统包"
  if command -v apt-get &>/dev/null; then
    apt-get update -y && apt-get upgrade -y
  elif command -v yum &>/dev/null; then
    yum update -y
  elif command -v dnf &>/dev/null; then
    dnf update -y
  fi
  log "系统包已更新"
}

# ── 安装 Node.js 22 ──────────────────────────────────────
install_node() {
  head "安装 Node.js 22"
  if command -v node &>/dev/null; then
    local v=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$v" -ge 18 ]; then
      log "Node.js $(node -v) 已安装"
      return
    fi
  fi

  # 使用 NodeSource 安装 Node.js 22
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  if command -v apt-get &>/dev/null; then
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    yum install -y nodejs
  fi
  log "Node.js $(node -v)"
}

# ── 安装 pnpm ─────────────────────────────────────────────
install_pnpm() {
  head "安装 pnpm"
  if command -v pnpm &>/dev/null; then
    log "pnpm $(pnpm -v) 已安装"
    return
  fi
  npm install -g pnpm
  log "pnpm $(pnpm -v)"
}

# ── 安装 PM2 ──────────────────────────────────────────────
install_pm2() {
  head "安装 PM2"
  if command -v pm2 &>/dev/null; then
    log "PM2 $(pm2 -v) 已安装"
    return
  fi
  npm install -g pm2
  log "PM2 $(pm2 -v)"
}

# ── 安装 Git ──────────────────────────────────────────────
install_git() {
  head "安装 Git"
  if command -v git &>/dev/null; then
    log "Git $(git --version | awk '{print $3}') 已安装"
    return
  fi
  if command -v apt-get &>/dev/null; then
    apt-get install -y git
  elif command -v yum &>/dev/null; then
    yum install -y git
  fi
  log "Git 已安装"
}

# ── 安装其他工具 ──────────────────────────────────────────
install_tools() {
  head "安装系统工具"
  if command -v apt-get &>/dev/null; then
    apt-get install -y curl wget unzip build-essential 2>/dev/null || true
  elif command -v yum &>/dev/null; then
    yum install -y curl wget unzip gcc-c++ make 2>/dev/null || true
  fi
  log "工具已安装"
}

# ── 配置防火墙 ────────────────────────────────────────────
configure_firewall() {
  head "配置防火墙 (端口 ${PORT})"

  # firewalld (CentOS / Alibaba Linux)
  if command -v firewall-cmd &>/dev/null; then
    systemctl start firewalld 2>/dev/null || true
    systemctl enable firewalld 2>/dev/null || true
    firewall-cmd --zone=public --add-port=${PORT}/tcp --permanent 2>/dev/null && \
    firewall-cmd --reload 2>/dev/null && \
    log "firewalld 已放行 ${PORT}/tcp" || \
    warn "firewalld 配置失败，请手动放行"
  fi

  # ufw (Ubuntu)
  if command -v ufw &>/dev/null; then
    ufw allow ${PORT}/tcp 2>/dev/null && log "ufw 已放行 ${PORT}/tcp" || \
    warn "ufw 配置失败，请手动放行"
  fi

  # iptables
  if ! command -v firewall-cmd &>/dev/null && ! command -v ufw &>/dev/null; then
    iptables -I INPUT -p tcp --dport ${PORT} -j ACCEPT 2>/dev/null && \
    log "iptables 已放行 ${PORT}/tcp" || true
  fi
}

# ── 克隆项目 (可选) ───────────────────────────────────────
clone_project() {
  head "项目代码"
  local repo_url="${1:-}"
  if [ -z "$repo_url" ]; then
    warn "未提供 Git 仓库地址，跳过克隆。请手动上传代码或执行:"
    echo "  git clone <your-repo-url> /opt/bopet-eda"
    return
  fi
  local target="/opt/bopet-eda"
  if [ -d "$target" ]; then
    warn "$target 已存在，跳过克隆"
    return
  fi
  git clone "$repo_url" "$target"
  log "项目已克隆到 $target"
}

# ── 主流程 ────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   BOPET EDA — 阿里云 ECS 环境初始化          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
  echo ""

  # 必须以 root 权限运行
  if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}请以 root 权限运行: sudo bash scripts/setup-aliyun.sh${NC}"
    exit 1
  fi

  detect_os
  update_system
  install_tools
  install_git
  install_node
  install_pnpm
  install_pm2
  configure_firewall

  # 克隆项目 (可选参数)
  clone_project "${1:-}"

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  环境初始化完成!                             ║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║  下一步:                                     ║${NC}"
  echo -e "${CYAN}║  1. 进入项目目录                             ║${NC}"
  echo -e "${CYAN}║  2. 配置 .env.production                     ║${NC}"
  echo -e "${CYAN}║  3. 执行 ./scripts/deploy.sh                 ║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
  echo -e "${YELLOW}║  ⚠ 阿里云安全组必须手动放行端口 ${PORT} !      ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

main "$@"
