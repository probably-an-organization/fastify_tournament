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

export const FASTIFY_ROUTES = [];
