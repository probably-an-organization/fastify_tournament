import { FastifyInstance } from "fastify/types/instance";

const SCHEMA = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        username: { type: "string" },
        password: { type: "string" },
      },
      required: ["username", "password"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  },
};

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function post(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.post("/post", SCHEMA, async (request, reply): Promise<void> => {
    try {
      reply.code(200).send(request.body);
    } catch (err) {
      reply.code(422).send();
    }
  });
}
