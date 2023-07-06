import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { verifyTournamentUserPermission } from "../../../utils/fastify/pgTournamentUserPermissionUtils";

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
          created: { type: "string" /*, format: "date-time" */ },
          name: { type: "string" },
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                _id: { type: "number" },
                created: { type: "string" /*, format: "date-time" */ },
                date: { type: "string" /*, format: "date-time" */ },
                information: { type: "string" },
                match_number: { type: "number" },
                participant_1_id: { type: "number" },
                participant_2_id: { type: "number" },
                stage_number: { type: "number" },
                status: { type: "string" },
                updated: { type: "string" /*, format: "date-time" */ },
                winner: { type: "number" },
              },
              required: [
                "_id",
                "created",
                "date",
                "information",
                "match_number",
                "participant_1_id",
                "participant_2_id",
                "stage_number",
                "status",
                "updated",
                "winner",
              ],
            },
          },
          participants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                _id: { type: "number" },
                country_id: { type: "string" },
                created: { type: "string" /*, format: "date-time" */ },
                name: { type: "string" },
                team: { type: "string" },
                updated: { type: "string" /*, format: "date-time" */ },
              },
              required: [
                "_id",
                "country_id",
                "created",
                "name",
                "team",
                "updated",
              ],
            },
          },
          public: { type: "boolean" },
          updated: { type: "string" /*, format: "date-time" */ },
        },
        required: [
          "_id",
          "created",
          "matches",
          "name",
          "public",
          "participants",
          "updated",
        ],
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
                  id as _id,
                  *
                FROM
                  knockout_tournament.tournaments
                WHERE
                  id = $1::BIGINT
              `,
              [id]
            );
            if (knockoutResult.rows.length < 1) {
              release();
              return reply.code(404).send("No knockout tournament found");
            }

            tournament = knockoutResult.rows[0];

            const knockoutMatchesResult = await client.query(
              `
                SELECT
                  id as _id,
                  *
                FROM
                  knockout_tournament.matches
                WHERE
                  tournament_id = $1::BIGINT
                ORDER BY
                  stage_number ASC,
                  match_number ASC
              `,
              [tournament._id]
            );
            if (knockoutMatchesResult.rows.length < 1) {
              release();
              return reply
                .code(404)
                .send("No knockout tournament matches found");
            }

            tournament.matches = knockoutMatchesResult.rows;

            const knockoutParticipantsResult = await client.query(
              `
                SELECT
                  id as _id,
                  *
                FROM
                  knockout_tournament.participants
                WHERE
                  tournament_id = $1::BIGINT
              `,
              [tournament._id]
            );

            if (knockoutParticipantsResult.rows.length < 1) {
              release();
              return reply
                .code(404)
                .send("No knockout tournament participants found");
            }

            tournament.participants = knockoutParticipantsResult.rows;
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
