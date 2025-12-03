export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: env('DATABASE_FILENAME', '.tmp/data.db'),
        },
        useNullAsDefault: true,
      },
    };
  }

  // PostgreSQL (Render)
  return {
    connection: {
      client: 'postgres',
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi123'),
        ssl: env.bool('DATABASE_SSL', false)
          ? { rejectUnauthorized: false }
          : false,
      },
    },
  };
};
