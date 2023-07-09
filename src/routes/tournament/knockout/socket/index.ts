import { FastifyInstance } from "fastify";
import knockoutSocketTest from "./test";
import knockoutSocketBroadcastMatch from "./broadcast-match";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutSocketRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(knockoutSocketTest);
  fastify.register(knockoutSocketBroadcastMatch);
}
