import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { verifyTournamentUserPermission } from "../../../utils/fastify/pgTournamentUserPermissionUtils";
import { APP_ORIGIN } from "../../../configs/setupConfig";

const paramsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    properties: {
      editPermission: { type: "boolean" },
      tournament: {
        type: "object",
        properties: {
          _id: { type: "number" },
          name: { type: "string" },
          public: { type: "boolean" },
          created: { type: "string", format: "date-time" },
          updated: { type: "string", format: "date-time" },
          participants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                _id: { type: "number" },
                name: { type: "string" },
                team: { type: "string" },
                country_id: { type: "string" },
              },
            },
          },
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                _id: { type: "number" },
                date: { type: "string", format: "date-time" },
                information: { type: "string" },
                match_number: { type: "number" },
                participant_1_id: { type: "number" },
                participant_2_id: { type: "number" },
                stage_number: { type: "number" },
                status: { type: "string" },
                winner: { type: "number" },
              },
            },
          },
        },
      },
    },
    required: ["editPermission", "tournament"],
  },
  400: { type: "string" },
  404: { type: "string" },
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
      response: responseJsonSchema,
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

          let tournament;
          let editPermission = false;

          try {
            const knockoutResult = await client.query(
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
                        'team', p.team,
                        'country_id', p.country_id
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
                        'date', m.date,
                        'information', m.information,
                        'match_number', m.match_number,
                        'participant_1_id', m.participant_1_id,
                        'participant_2_id', m.participant_2_id,
                        'stage_number', m.stage_number,
                        'status', m.status,
                        'winner', m.winner
                      )
                      ORDER BY
                      stage_number ASC,
                      match_number ASC
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
            if (knockoutResult.rows.length < 1) {
              release();
              return reply.code(404).send("No knockout tournament found");
            }
            tournament = knockoutResult.rows[0];
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }

          try {
            const { _id } = await fastify.decodeUserToken(request);
            editPermission = await verifyTournamentUserPermission(
              id,
              _id,
              client
            );
            release();
            if (editPermission) {
              return reply.code(200).send({ editPermission, tournament });
            } else {
              throw Error("No permission");
            }
          } catch (err) {
            release();
            if (tournament.public) {
              return reply.code(200).send({ editPermission, tournament });
            } else {
              return reply.code(401).send("No permission");
            }
          }
        }
      );
    });
}
