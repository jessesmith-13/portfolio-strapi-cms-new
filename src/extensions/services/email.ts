export default ({ env }) => ({
  email: {
    provider: 'nodemailer', // Strapi 5 uses 'provider' directly, not provider.init
    config: {
      host: env('SMTP_HOST'),
      port: env.int('SMTP_PORT', 587),
      auth: {
        user: env('SMTP_USER'),
        pass: env('SMTP_PASS'),
      },
      secure: false,
      defaultFrom: env('SMTP_DEFAULT_FROM', 'jesselsmith713@gmail.com'),
      defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'jesselsmith713@gmail.com'),
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
});
