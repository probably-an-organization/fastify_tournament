import { FastifyInstance } from "fastify";

import createKnockout from "./create-knockout";
import knockoutTournament from "./knockout-tournament";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(createKnockout);
  fastify.register(knockoutTournament);
}
