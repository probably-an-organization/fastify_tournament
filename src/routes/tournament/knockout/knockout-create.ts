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
    description: { type: "string" },
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
  },
  required: ["name", "participants"],
} as const;

const responseJsonSchema = {
  201: {
    type: "object",
    properties: {
      _id: { type: "number" },
      created: { type: "string" /*, format: "date-time" */ },
      description: { type: "string" },
      matches: {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "number" },
              created: { type: "string" /*, format: "date-time" */ },
              match_number: { type: "number" },
              participant_1_id: { type: "number", nullable: true },
              participant_2_id: { type: "number", nullable: true },
              stage_number: { type: "number" },
              tournament_id: { type: "number" },
              updated: { type: "string" /*, format: "date-time" */ },
            },
            required: [
              "_id",
              "created",
              "match_number",
              "participant_1_id",
              "participant_2_id",
              "stage_number",
              "tournament_id",
              "updated",
            ],
          },
        },
      },
      name: { type: "string" },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            _id: { type: "number" },
            country: { type: "string" },
            created: { type: "string" /*, format: "date-time" */ },
            name: { type: "string" },
            team: { type: "string" },
            updated: { type: "string" /*, format: "date-time" */ },
          },
        },
        required: ["_id", "created", "name", "team", "updated"],
      },
      updated: { type: "string" /*, format: "date-time" */ },
    },
    required: ["_id", "created", "name", "updated"],
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
export default async function knockoutCreate(
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
    .post("/knockout-create", routeOptions, (request, reply): void => {
      const { description, lineups, name, participants } = request.body;
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
            const newKnockoutResult = await client.query(
              `
                INSERT INTO
                  knockout_tournament.tournaments (name, description)
                VALUES (
                  $1::VARCHAR, $2::VARCHAR
                )
                RETURNING
                  id AS _id,
                  *
              `,
              [name, description]
            );

            const tournament = newKnockoutResult.rows[0];

            const newKnockoutParticipantsResult = await client.query(
              `
                INSERT INTO
                  knockout_tournament.participants (tournament_id, name, team, country_id)
                VALUES ${participants.map(
                  (p) =>
                    `($1::BIGINT,
                    '${p.name}'::VARCHAR,
                    '${p.team}'::VARCHAR,
                    ${p.country ? `'${p.country}'::VARCHAR` : "NULL"})`
                )}
                RETURNING
                  id AS _id,
                  *
              `,
              [tournament._id]
            );

            tournament.participants = newKnockoutParticipantsResult.rows;

            const newKnockoutUserResult = await client.query(
              `
              INSERT INTO
                knockout_tournament.tournaments_users (tournament_id, user_id)
              VALUES
                ($1::BIGINT, $2::BIGINT)
              RETURNING
                tournament_id,
                user_id
              `,
              [tournament._id, _id]
            );

            const matches = await createKnockoutMatches(
              {
                tournament,
                lineups: lineups as [number, number][],
              },
              client
            );

            release();

            return reply.code(201).send({ ...tournament, matches });
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
