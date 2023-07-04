import { FastifyInstance } from "fastify/types/instance";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { APP_ORIGIN } from "../../configs/setupConfig";

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
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get(
      "/login-verification",
      routeOptions,
      async (request, reply): Promise<void> => {
        try {
          const { _id } = await fastify.decodeUserToken(request);
          return reply.code(200).send();
        } catch (err) {
          // return reply.code(401).redirect(APP_ORIGIN + "/tournament") // NOT WORKING
          return reply.code(401).send();
        }
      }
    );
}
