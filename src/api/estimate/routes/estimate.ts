module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/estimate',
      handler: 'estimate.submitEstimate',
      config: {
        auth: false,
      },
    },
  ],
}
