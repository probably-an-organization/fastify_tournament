import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";

const paramsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    userId: { type: "number" },
  },
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function tournaments(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      params: paramsJsonSchema,
    },
    onRequest: [fastify.authenticate],
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/tournaments/:userId?", routeOptions, (request, reply): void => {
      // TODO verify admin permission
      const { userId } = request.params;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err);
          }
          try {
            const result = await client.query(
              userId
                ? `
              SELECT
                t.id as _id,
                t.name,
                COUNT(p.tournament_id) AS participants
              FROM
                knockout_tournament.tournaments AS t
              INNER JOIN
                knockout_tournament.tournaments_users AS tu
              ON
                t.id = tu.tournament_id
              LEFT JOIN
                knockout_tournament.participants AS p
              ON
                t.id = p.tournament_id
              WHERE
                tu.user_id = '${userId}'::BIGINT
              GROUP BY
                t.id
            `
                : `
            SELECT
              t.id as _id,
              t.name,
              COUNT(p.tournament_id) AS participants
            FROM
              knockout_tournament.tournaments AS t
            LEFT JOIN
              knockout_tournament.participants AS p
            ON
              t.id = p.tournament_id
            GROUP BY
              t.id
            `
            );
            release();
            return reply.code(200).send(result.rows);
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
