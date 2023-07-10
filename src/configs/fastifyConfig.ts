import type { FastifyCookieOptions } from "@fastify/cookie";
import type { FastifyContextConfig } from "fastify";

import { EnvironmentType, getEnvironmentVariable } from "../utils/envUtils";
import { APP_ORIGIN, JWT_SECRET } from "./setupConfig";

export const FASTIFY_CONFIG: FastifyContextConfig = {
  logger: getEnvironmentVariable("FASTIFY_LOGGER", EnvironmentType.Boolean),
};

export const FASTIFY_COOKIE_CONFIG: FastifyCookieOptions = {
  secret: getEnvironmentVariable("FASTIFY_COOKIE_SECRET"),
};

export const FASTIFY_CORS_CONFIG = {
  credentials: true,
  optionsSuccessStatus: 200,
  methods: "GET,PUT,POST,DELETE,OPTIONS",
  origin: APP_ORIGIN,
  // origin: (origin, callback) => {
  //   if (origin === APP_ORIGIN) {
  //     callback(null, true);
  //   } else {
  //     callback(new Error("[CORS]: not allowed"), false);
  //   }
  // },
};

export const FASTIFY_PG_CONFIG = {
  connectionString: `postgres://${getEnvironmentVariable(
    "POSTGRES_USER"
  )}:${encodeURIComponent(
    getEnvironmentVariable("POSTGRES_PASSWORD")
  )}@${getEnvironmentVariable("POSTGRES_HOST")}/${getEnvironmentVariable(
    "POSTGRES_DATABASE"
  )}`,
};

export const FASTIFY_JWT_CONFIG = {
  secret: JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
  // sign: {
  //   expiresIn: "30min",
  // },
};

export const FASTIFY_RATE_LIMIT_CONFIG = {
  // global : false, // default true
  max: 5, // default 1000
  // ban: 2, // default null
  timeWindow: 1000 * 10, // ms, default 1000 * 60
  // hook: 'preHandler', // default 'onRequest'
  // cache: 10000, // default 5000
  // allowList: ['127.0.0.1'], // default []
  // redis: new Redis({ host: '127.0.0.1' }), // default null
  // nameSpace: 'teste-ratelimit-', // default is 'fastify-rate-limit-'
  // continueExceeding: true, // default false
  // skipOnError: true, // default false
  // keyGenerator: function (request) { /* ... */ }, // default (request) => request.raw.ip
  // errorResponseBuilder: function (request, context) { /* ... */},
  // enableDraftSpec: true, // default false. Uses IEFT draft header standard
  // addHeadersOnExceeding: { // default show all the response headers when rate limit is not reached
  //   'x-ratelimit-limit': true,
  //   'x-ratelimit-remaining': true,
  //   'x-ratelimit-reset': true
  // },
  // addHeaders: { // default show all the response headers when rate limit is reached
  //   'x-ratelimit-limit': true,
  //   'x-ratelimit-remaining': true,
  //   'x-ratelimit-reset': true,
  //   'retry-after': true
  // }
};
