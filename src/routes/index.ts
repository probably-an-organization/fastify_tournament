import { FastifyInstance } from "fastify";

import authenticationRoutes from "./authentication";
import tournamentRoutes from "./tournament";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function routes(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  fastify.register(authenticationRoutes);
  fastify.register(tournamentRoutes);
}
