import { FastifyInstance } from "fastify/types/instance";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function postgres(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.get("/postgres/:username", (request: any, reply): void => {
    fastify.pg.connect(onConnect);

    function onConnect(err: any, client: any, release: any) {
      if (err) return reply.send(err);

      client.query(
        "SELECT id, username, password FROM private.users WHERE username=$1",
        [request.params.username],
        function onResult(err: any, result: any) {
          release();
          reply.send(err || result);
        }
      );
    }
  });
}
