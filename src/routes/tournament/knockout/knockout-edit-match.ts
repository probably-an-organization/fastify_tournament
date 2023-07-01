import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { verifyTournamentUserPermission } from "../../../utils/fastify/pgTournamentUserPermissionUtils";

// TODO

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["future", "past", "live"] },
    date: { type: "string" },
    participant_1_id: { type: "number" },
    participant_2_id: { type: "number" },
    winner: { type: "number", enum: [0, 1, 2] },
  },
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
    properties: {
      _id: { type: "number" },
      status: { type: "string", enum: ["future", "past", "live"] },
      date: { type: "string" },
      participant_1_id: { type: "number" },
      participant_2_id: { type: "number" },
      winner: { type: "number", enum: [0, 1, 2] },
      tournament_id: { type: "number" },
      match_number: { type: "number" },
      stage_number: { type: "number" },
    },
    required: [
      "_id",
      "status",
      "date",
      "participant_1_id",
      "participant_2_id",
      "winner",
      "tournament_id",
      "match_number",
      "stage_number",
    ],
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
export default async function knockoutEditMatch(
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
    .put("/knockout-edit-match/:id", routeOptions, (request, reply): void => {
      const { id } = request.params;
      const { status, date, participant_1_id, participant_2_id, winner } =
        request.body;
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
                  m.tournament_id
                FROM
                  knockout_tournament.matches AS m
                RIGHT JOIN
                  knockout_tournament.tournaments_users AS tu
                ON
                  m.tournament_id = tu.tournament_id
                WHERE
                  m.id = $1::BIGINT
                AND
                  tu.user_id = $2::BIGINT
              `,
              [id, _id]
            );

            if (tournamentResult.rows.length !== 1) {
              throw Error("No tournament found");
            }

            const tournamentId = tournamentResult.rows[0].tournament_id;
            await verifyTournamentUserPermission(tournamentId, _id, client);

            const updates = [];
            if (status) {
              updates.push(
                `status = '${status}'::knockout_tournament.match_status_types`
              );
            }
            if (date) {
              updates.push(`date = '${date}'::TIMESTAMPTZ`);
            }
            if (participant_1_id) {
              updates.push(`participant_1_id = '${participant_1_id}'::BIGINT`);
            }
            if (participant_2_id) {
              updates.push(`participant_2_id = '${participant_2_id}'::BIGINT`);
            }
            if (winner) {
              updates.push(`winner = '${winner}'::CHAR`);
            }

            console.log("QUERY", updates.join(","));

            // TODO if winner is selected, next match should have the winner as participant_X_id
            const result = await client.query(
              `
              UPDATE
                knockout_tournament.matches
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

            console.log("OAKWDKOAWD", result);

            release();
            if (result.rows.length < 1) {
              return reply.code(400).send("Error????");
            }
            return reply.code(200).send(result.rows[0]);
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
