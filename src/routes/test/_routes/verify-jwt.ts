import { FastifyInstance } from "fastify/types/instance";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function verifyJwt(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.get(
    "/verify-jwt",
    { onRequest: [fastify.authenticate] },
    async (request, reply): Promise<any> => {
      return request.user;
    }
  );
}
