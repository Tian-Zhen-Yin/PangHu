module.exports = {
  apps: [
    {
      name: 'panghu-backend',
      cwd: './backend',
      script: 'npx',
      args: 'tsx src/server.ts',
      interpreter: 'none',

      env: {
        NODE_ENV: 'production',
      },

      max_memory_restart: '400M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,

      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      autorestart: true,
      watch: false,
    },
  ],
}
