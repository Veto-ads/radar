module.exports = {
  apps: [
    {
      name: "veto-ads-web",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
