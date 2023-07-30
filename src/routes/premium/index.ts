import { FastifyInstance } from "fastify";

import models from "./models";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function premiumRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(models);
}
