import { FastifyInstance } from "fastify/types/instance";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function ping(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.get("/ping", async (request, reply): Promise<void> => {
    reply.code(200).send("pong");
  });
}
