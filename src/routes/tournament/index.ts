import { FastifyInstance } from "fastify";

import knockoutRoutes from "./knockout";
import myTournaments from "./my-tournaments";
import tournaments from "./tournaments";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function tournamentRoutes(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  fastify.register(tournaments);
  fastify.register(myTournaments);
  fastify.register(knockoutRoutes);
}
