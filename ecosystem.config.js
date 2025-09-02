module.exports = {
  apps: [
    {
      name: 'anarq-backend',
      cwd: 'backend',
      script: 'server.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
