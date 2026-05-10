/**
 * PM2 Ecosystem Configuration — BOPET EDA 数据平台
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs              # 启动
 *   pm2 restart ecosystem.config.cjs            # 重启
 *   pm2 stop ecosystem.config.cjs               # 停止
 *   pm2 delete ecosystem.config.cjs             # 删除
 *   pm2 logs bopet-eda                          # 查看日志
 *   pm2 monit                                    # 实时监控
 *   pm2 save && pm2 startup                     # 设置开机自启
 */
module.exports = {
  apps: [
    {
      name: 'bopet-eda',
      // Production entry: resolves DATABASE_URL to absolute path, then starts Nitro
      script: 'scripts/start.mjs',
      cwd: __dirname,

      // Restart on crash (delay 3s to avoid rapid cycling)
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Memory & CPU
      max_memory_restart: '512M',
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
