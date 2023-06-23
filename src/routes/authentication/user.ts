import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";

const paramsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function user(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      // body: {},
      // querystring: {},
      params: paramsJsonSchema,
      // header: {},
      // response: {},
    },
    // ...
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/user/:id", routeOptions, (request, reply): void => {
      const { id } = request.params;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            const result = await client.query(
              `
            SELECT
              a.user_id,
              a.username,
              a.email,
              a.verified,
              a.role_id
            FROM
              authentication.users AS a
            WHERE
              a.user_id = $1::BIGINT
          `,
              [id]
            );
            release();

            if (result) {
              return reply.code(200).send(result.rows[0]);
            } else {
              return reply.code(400).send("No user found");
            }
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
