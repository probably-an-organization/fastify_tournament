import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function login(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      // body: {},
      // querystring: {},
      // params: {},
      // header: {},
      // response: {},
    },
    // ...
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/tournaments", routeOptions, (request, reply): void => {
      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) return reply.code(400).send(err);

        client.query(
          `
            SELECT
              tournament_id,
              name,
              participants
            FROM
              knockout_tournament.tournaments
          `,
          (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err);
            }
            reply.code(200).send(result.rows);
          }
        );
      });
    });
}
