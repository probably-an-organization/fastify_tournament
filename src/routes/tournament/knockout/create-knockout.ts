import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { createKnockoutMatches } from "../../../utils/fastify/pgKnockoutTournamentUtils";
import { verifyPermission } from "../../../utils/fastify/pgPermissionUtils";
import { hasUniqueNumbers } from "../../../utils/arrayUtils";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    participants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          team: { type: "string" },
        },
        required: ["name", "team"],
      },
    },
    lineups: {
      type: "array",
      items: {
        type: "array",
        maxItems: 2,
        minItems: 2,
        items: {
          type: "number",
        },
      },
    },
  },
  required: ["name", "participants"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    properties: {
      _id: { type: "number" },
      name: { type: "string" },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            _id: { type: "number" },
            name: { type: "string" },
            team: { type: "string" },
          },
        },
        required: ["_id", "name", "team"],
      },
      matches: {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "number" },
              tournament_id: { type: "number" },
              participant_1_id: { type: "number", nullable: true },
              participant_2_id: { type: "number", nullable: true },
              match_number: { type: "number" },
              stage_number: { type: "number" },
            },
            required: [
              "_id",
              "tournament_id",
              "participant_1_id",
              "participant_2_id",
              "match_number",
              "stage_number",
            ],
          },
        },
      },
    },
    required: ["_id", "name"],
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
export default async function createKnockoutV2(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      body: bodyJsonSchema,
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate], // fastify-jwt
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .post("/create-knockout", routeOptions, (request, reply): void => {
      const { lineups, name, participants } = request.body;
      const { _id } = request.user;

      if (lineups) {
        if (lineups.length !== Math.ceil(participants.length / 2)) {
          reply.code(400).send("Lineups and participants do not match");
          return;
        }
        if (!hasUniqueNumbers(lineups)) {
          reply.code(400).send("Lineup config error");
          return;
        }
      }

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            await verifyPermission(1, _id, client);
            const result = await client.query(
              `
                WITH new_tournament AS (
                  INSERT INTO
                    knockout_tournament.tournaments (name)
                  VALUES
                    ('${name}'::VARCHAR)
                  RETURNING
                    id,
                    name
                ),
                new_participants AS (
                  INSERT INTO
                    knockout_tournament.participants (tournament_id, name, team)
                  VALUES ${participants.map(
                    (p) =>
                      `((SELECT id FROM new_tournament), '${p.name}'::VARCHAR, '${p.team}'::VARCHAR)`
                  )}
                  RETURNING
                    id AS _id,
                    name,
                    team
                ),
                new_tournaments_users AS (
                  INSERT INTO
                    knockout_tournament.tournaments_users (tournament_id, user_id)
                  VALUES
                    ((SELECT id FROM new_tournament), '${_id}'::BIGINT)
                  RETURNING
                    tournament_id,
                    user_id
                )
                SELECT
                    t.id AS _id,
                    t.name AS name,
                    jsonb_agg(p) AS participants
                FROM
                  new_tournament as t,
                  new_participants as p
                GROUP BY
                  t.id,
                  t.name
              `
            );
            const tournament = result.rows[0];
            const matches = await createKnockoutMatches(
              tournament,
              client,
              lineups as [number, number][]
            );

            release();

            return reply.code(200).send({ ...tournament, matches });
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
