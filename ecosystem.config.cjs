/**
 * PM2 Ecosystem Configuration — BOPET EDA 数据平台
 * 阿里云 ECS 公网部署 @ 端口 3001
 *
 * 快速命令:
 *   pm2 start ecosystem.config.cjs              # 首次启动
 *   pm2 restart ecosystem.config.cjs            # 重启
 *   pm2 stop bopet-eda                          # 停止
 *   pm2 logs bopet-eda                          # 日志
 *   pm2 save && pm2 startup                     # 开机自启
 */
module.exports = {
  apps: [
    {
      name: 'bopet-eda',
      script: 'scripts/start.mjs',
      cwd: __dirname,

      // ── 公网绑定 ──
      // HOST=0.0.0.0 使服务监听所有网络接口 (公网 + 内网均可访问)
      // PORT=3001 生产端口
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '3001',
      },

      // ── 进程守护 ──
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '512M',
      instances: 1,
      exec_mode: 'fork',

      // ── 日志 (带时间戳) ──
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── 优雅退出 ──
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
