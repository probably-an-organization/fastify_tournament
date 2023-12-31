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
        created: { type: "string" /*, format: "date-time" */ },
        description: { type: "string" },
        name: { type: "string" },
        participants: { type: "number" },
        type: { type: "string" },
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
            // TODO currently participants count is only retrieved from knockout tournaments
            // once there are more tournament types, another way of retrieving participants is needed!
            const result = await client.query(
              `
              SELECT
                t.id as _id,
                t.created,
                t.description,
                t.name,
                t.updated,
                t.type,
                COUNT(p.tournament_id) AS participants
              FROM
                tournament.tournaments AS t
              INNER JOIN
                tournament.tournaments_users AS tu
              ON
                t.id = tu.tournament_id
              LEFT JOIN
                knockout.participants AS p
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
