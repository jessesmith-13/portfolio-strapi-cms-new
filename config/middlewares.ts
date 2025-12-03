export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: "strapi::cors",
    config: {
      origin: [
        "http://localhost:3000",
        "https://portfolio-site-redesign-qwc5qtu4y-jesses-projects-98ea59e3.vercel.app/",
        "https://www.jessesmith.tech",
        "https://jessesmith.tech"
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      headers: "*",
    },
  },
  'strapi::security',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];