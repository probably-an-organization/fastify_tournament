import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { verifyTournamentUserPermission } from "../../utils/fastify-pg/pgTournamentUserPermissionUtils";
import { isEqual, parseJSON } from "date-fns";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    created: { type: "string" /*, format: "date-time" */ },
    name: { type: "string" },
    public_access: { type: "boolean" },
    updated: { type: "string" /*, format: "date-time" */ },
  },
  required: ["created", "updated"],
} as const;

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
          public_access: { type: "boolean" },
          updated: { type: "string" /*, format: "date-time" */ },
        },
        required: [
          "_id",
          "created",
          "matches",
          "name",
          "public_access",
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
export default async function knockoutEditTournament(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      body: bodyJsonSchema,
      params: paramsJsonSchema,
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate], // fastify-jwt
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .put(
      "/knockout-edit-tournament/:id",
      routeOptions,
      (request, reply): void => {
        const { id } = request.params;
        const { created, name, public_access, updated } = request.body;
        const { _id } = request.user;

        fastify.pg.connect(
          async (err: Error, client: PoolClient, release: any) => {
            if (err) {
              release();
              return reply.code(400).send(err.message);
            }

            try {
              const tournamentResult = await client.query(
                `
                SELECT
                  id as _id,
                  *
                FROM
                  tournament.tournaments AS t
                RIGHT JOIN
                  tournament.tournaments_users AS tu
                ON
                  t.id = tu.tournament_id
                WHERE
                  t.id = $1::BIGINT
                AND
                  tu.user_id = $2::BIGINT
              `,
                [id, _id]
              );

              if (tournamentResult.rows.length !== 1) {
                throw Error("No match found");
              }

              let tournament = tournamentResult.rows[0];
              await verifyTournamentUserPermission(tournament._id, _id, client);

              if (!isEqual(tournament.updated, parseJSON(updated))) {
                throw Error("Updated date does not match");
              }

              const updates = [];
              if (name) {
                updates.push(`name = '${name}'::VARCHAR`);
              }
              if (public_access) {
                updates.push(`public_access = '${public_access}'::BOOLEAN`);
              }

              const updateTournamentResult = await client.query(
                `
              UPDATE
                tournament.tournaments
              SET
                ${updates.join(",")}
              WHERE
                id = $1::BIGINT
              RETURNING
                id as _id,
                *
            `,
                [id]
              );

              release();
              if (updateTournamentResult.rows.length < 1) {
                return reply.code(400).send("Error????");
              }
              return reply.code(200).send(updateTournamentResult.rows[0]);
            } catch (err) {
              release();
              return reply.code(400).send(err as string);
            }
          }
        );
      }
    );
}
