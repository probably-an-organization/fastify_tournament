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
export default async function knockoutTournament(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      params: paramsJsonSchema,
    },
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/knockout-tournament/:id", routeOptions, (request, reply): void => {
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
                  t.id as _id,
                  t.name,
                  t.public,
                  t.created,
                  t.updated,
                  participants,
                  matches
                FROM
                  knockout_tournament.tournaments AS t
                LEFT JOIN LATERAL (
                  SELECT
                    json_agg(
                      json_build_object(
                        '_id', p.id,
                        'name', p.name,
                        'team', p.team
                      )
                    ) AS participants
                  FROM
                    knockout_tournament.participants AS p
                  WHERE
                    p.tournament_id = $1::BIGINT
                ) p ON true
                LEFT JOIN LATERAL (
                  SELECT
                    json_agg(
                      json_build_object(
                        '_id', m.id,
                        'status', m.status,
                        'date', m.date,
                        'participant_1_id', m.participant_1_id,
                        'participant_2_id', m.participant_2_id,
                        'winner', m.winner,
                        'match_number', m.match_number,
                        'stage_number', m.stage_number
                      )
                    ) AS matches
                  FROM
                    knockout_tournament.matches AS m
                  WHERE
                    m.tournament_id = $1::BIGINT
                ) m ON true
                WHERE
                  t.id = $1::BIGINT
              `,
              [id]
            );
            if (result.rows.length < 1) {
              release();
              return reply.code(404).send("No knockout tournament found");
            }

            const knockout = result.rows[0];
            if (knockout.public) {
              release();
              return reply.code(200).send(result.rows[0]);
            }

            const { _id } = await fastify.authenticate(request, reply);
            const tournamentUsersResult = await client.query(
              `
                SELECT
                  *
                FROM
                  knockout_tournament.tournaments_users
                WHERE
                  tournament_id = $1::BIGINT
                AND
                  user_id = $2::BIGINT
              `,
              [id, _id]
            );
            release();
            if (tournamentUsersResult.rows.length > 0) {
              return reply.code(200).send(result.rows[0]);
            } else {
              return reply.code(400).send("No permission, not public");
            }
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
