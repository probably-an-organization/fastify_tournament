import { FastifyInstance } from "fastify/types/instance";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import type { PoolClient, QueryResult } from "pg";

const responseJsonSchema = {
  200: {
    type: "array",
    items: {
      type: "object",
      properties: {
        userId: { type: "number" },
        username: { type: "string" },
        email: { type: "string" },
        verified: { type: "boolean" },
        roleId: { type: "number" },
      },
    },
  },
  400: {
    type: "string",
  },
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function users(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      // body: {},
      // querystring: {},
      // params: {},
      // header: {},
      response: responseJsonSchema,
    },
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/users", routeOptions, (request, reply): void => {
      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) reply.code(400).send(err.message);

        client.query(
          `
            SELECT
              *
            FROM
              authentication.users
          `,
          (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err.message);
            }

            reply.code(200).send(result.rows);
          }
        );
      });

      /* async */
      // return reply
    });
}
