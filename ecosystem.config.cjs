module.exports = {
  apps: [
    {
      name: 'uipe-airtel-uat',
      script: 'dist/main.js',
      node_args: '--env-file=.env',
      env: { NODE_ENV: 'production' },
    },
  ],
};
