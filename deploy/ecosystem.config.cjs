/**
 * PM2 — NestJS backend
 * Usage on VPS:
 *   cd /var/www/e-tashleh
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'e-tashleh-api',
      cwd: './backend',
      script: 'npm',
      args: 'run start:prod',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
