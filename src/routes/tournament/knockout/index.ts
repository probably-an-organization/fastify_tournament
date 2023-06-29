import { FastifyInstance } from "fastify";

import knockoutTournament from "./knockout-tournament";
import knockoutCreate from "./knockout-create";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(knockoutCreate);
  fastify.register(knockoutTournament);
}
