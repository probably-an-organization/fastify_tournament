import { FastifyInstance } from "fastify";

import knockoutCreate from "./knockout-create";
import knockoutEditMatch from "./knockout-edit-match";
import knockoutEditTournament from "./knockout-edit-tournament";
import knockoutSocketBroadcastMatch from "./knockout-socket-broadcast-match";
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
  fastify.register(knockoutCreate);
  fastify.register(knockoutEditMatch);
  fastify.register(knockoutEditTournament);
  fastify.register(knockoutSocketBroadcastMatch);
  fastify.register(knockoutTournament);
}
