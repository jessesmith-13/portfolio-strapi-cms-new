export default ({ env }) => ({
  // Email config removed - using Resend directly in controllers
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
});