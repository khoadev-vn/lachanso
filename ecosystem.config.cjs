// PM2 config cho backend Lá Chắn Số trên Vietnix
// Chạy: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "lachanso-backend",
      cwd: "./server",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "3G",
      env: {
        NODE_ENV: "production",
        PORT: "3001"
      },
      time: true
    }
  ]
};
