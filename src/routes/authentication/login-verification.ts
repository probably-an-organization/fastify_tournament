import { FastifyInstance } from "fastify/types/instance";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { PoolClient } from "pg";

const responseJsonSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    properties: {
      email: { type: "string" },
      username: { type: "string" },
      verified: { type: "boolean" },
    },
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
    .get("/login-verification", routeOptions, (request, reply): void => {
      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            const { _id } = await fastify.decodeUserToken(request);

            const result = await client.query(
              `
                SELECT
                  u.id AS _id,
                  u.email,
                  u.username,
                  u.verified
                FROM
                  authentication.users AS u
                WHERE
                  u.id = $1::BIGINT
              `,
              [_id]
            );
            release();
            return reply.code(200).send(result.rows[0]);
          } catch (err) {
            reply.code(401).send();
          }
        }
      );
    });
}
