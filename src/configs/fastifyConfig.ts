import { EnvironmentType, getEnvironmentVariable } from "../utils/envUtils";

type FastifyConfig = {
  logger: boolean;
};

export const FASTIFY_CONFIG: FastifyConfig = {
  logger: getEnvironmentVariable("FASTIFY_LOGGER", EnvironmentType.Boolean),
};

export const FASTIFY_PG_CONNECTION_STRING: string = `postgres://${getEnvironmentVariable(
  "POSTGRES_USER"
)}:${encodeURIComponent(
  getEnvironmentVariable("POSTGRES_PASSWORD")
)}@${getEnvironmentVariable("POSTGRES_HOST")}/${getEnvironmentVariable(
  "POSTGRES_DATABASE"
)}`;

export const FASTIFY_ROUTES = [];
