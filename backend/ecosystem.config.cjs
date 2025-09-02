module.exports = {
  apps: [
    {
      name: "anarq-backend",
      script: "./server.mjs",
      cwd: __dirname,
      interpreter: "node",
      env: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL
      }
    }
  ]
}
