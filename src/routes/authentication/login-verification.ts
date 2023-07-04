import { FastifyInstance } from "fastify/types/instance";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

const responseJsonSchema = {
  200: {
    type: "string",
  },
  400: {
    type: "string",
  },
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function loginVerification(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate],
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/login-verification", routeOptions, (request, reply): void => {
      // TODO use fastify.decodeUserToken here instead of fastify.authenticate above
      reply.code(200).send("Success");
    });
}
