/**
 * PM2 — NestJS backend
 * Usage on VPS:
 *   cd /var/www/e-tashleh
 *   pm2 delete e-tashleh-api   # once, when migrating from `pm2 start npm ...`
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *
 * Runs Node directly (no npm wrapper): npm is not a supervisor, swallows SIGINT/SIGTERM
 * for the child, and changes behaviour across npm majors (npm 12).
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'e-tashleh-api',
      // dotenv + ConfigModule resolve `.env` from the working directory.
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'dist/src/main.js',
      node_args: '-r ./register-prisma-aliases.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
      // Stop crash loops from hammering the DB / providers.
      exp_backoff_restart_delay: 200,
      min_uptime: '10s',
      max_restarts: 15,
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
