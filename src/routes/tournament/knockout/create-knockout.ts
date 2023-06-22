import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { createKnockoutMatches } from "../../../utils/fastify/pgKnockoutTournamentUtils";
import { verifyPermission } from "../../../utils/fastify/pgPermissionUtils";

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
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function createKnockout(
  fastify: FastifyInstance,
  options: Object
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
      const { name, participants } = request.body;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            await verifyPermission(1, request, client);
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
            await createKnockoutMatches(tournament, client);
            release();

            return reply.code(200).send(tournament);
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
