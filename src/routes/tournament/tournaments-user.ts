import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";

const responseJsonSchema = {
  200: {
    type: "array",
    items: {
      type: "object",
      properties: {
        _id: { type: "number" },
        name: { type: "string" },
        participants: { type: "number" },
        created: { type: "string" /*, format: "date-time" */ },
        updated: { type: "string" /*, format: "date-time" */ },
      },
      required: ["_id", "name", "participants", "created", "updated"],
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
export default async function myTournaments(
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
    .get("/tournaments-user", routeOptions, (request, reply): void => {
      const { _id } = request.user;

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
                t.id as _id,
                t.name,
                t.created,
                t.updated,
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
                tu.user_id = $1::BIGINT
              GROUP BY
                t.id
            `,
              [_id]
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
