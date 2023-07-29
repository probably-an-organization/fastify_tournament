import { FastifyInstance } from "fastify";

import knockoutRoutes from "../knockout";
import tournamentsUser from "./tournaments-user";
import tournaments from "./tournaments";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function tournamentRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(tournaments);
  fastify.register(tournamentsUser);
  // "/knockout"
  fastify.register(knockoutRoutes);
}
