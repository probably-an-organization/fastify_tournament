import { FastifyInstance } from "fastify/types/instance";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function jwt(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.get("/jwt", async (request, reply): Promise<void> => {
    const token = fastify.jwt.sign({ username: "Max Mustermann" });
    reply.send({ token });
  });
}
