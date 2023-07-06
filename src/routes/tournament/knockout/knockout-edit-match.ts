import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { verifyTournamentUserPermission } from "../../../utils/fastify/pgTournamentUserPermissionUtils";
import { isEven } from "../../../utils/mathUtils";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    created: { type: "string" },
    date: { type: "string" },
    information: { type: "string" },
    participant_1_id: { type: "number" },
    participant_2_id: { type: "number" },
    status: { type: "string", enum: ["future", "past", "live"] },
    updated: { type: "string" },
    winner: { type: "number", enum: [0, 1, 2] },
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
    type: "array",
    items: {
      type: "object",
      properties: {
        _id: { type: "number" },
        created: { type: "string" },
        date: { type: "string" },
        information: { type: "string" },
        match_number: { type: "number" },
        participant_1_id: { type: "number" },
        participant_2_id: { type: "number" },
        stage_number: { type: "number" },
        status: { type: "string", enum: ["future", "past", "live"] },
        tournament_id: { type: "number" },
        updated: { type: "string" },
        winner: { type: "number", enum: [0, 1, 2] },
      },
      required: [
        "_id",
        "created",
        "date",
        "match_number",
        "participant_1_id",
        "participant_2_id",
        "stage_number",
        "status",
        "tournament_id",
        "updated",
        "winner",
      ],
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
      const {
        created,
        date,
        information,
        participant_1_id,
        participant_2_id,
        status,
        updated,
        winner,
      } = request.body;
      const { _id } = request.user;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            const matchResult = await client.query(
              `
                SELECT
                  *
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

            if (matchResult.rows.length !== 1) {
              throw Error("No match found");
            }

            let currentMatch = matchResult.rows[0];
            await verifyTournamentUserPermission(
              currentMatch.tournament_id,
              _id,
              client
            );

            const updates = [];
            if (date) {
              updates.push(`date = '${date}'::TIMESTAMPTZ`);
            }
            if (information) {
              updates.push(`information = '${information}'::VARCHAR`);
            }
            if (participant_1_id) {
              updates.push(`participant_1_id = '${participant_1_id}'::BIGINT`);
            }
            if (participant_2_id) {
              updates.push(`participant_2_id = '${participant_2_id}'::BIGINT`);
            }
            if (status) {
              updates.push(
                `status = '${status}'::knockout_tournament.match_status_types`
              );
            }
            if (winner !== undefined) {
              updates.push(`winner = '${winner}'::CHAR`);
            }

            const updateMatchResult = await client.query(
              `
              UPDATE
                knockout_tournament.matches
              SET
                ${updates.join(",")}
              WHERE
                id = $1::BIGINT
              AND
                created = $2::TIMESTAMPTZ
              AND
                updated = $3::TIMESTAMPTZ
              RETURNING
                id as _id,
                *
            `,
              [id, created, updated]
            );

            const returnPayload = [updateMatchResult.rows[0]];

            let currentMatchWinner = Number(updateMatchResult.rows[0].winner);

            // recursively change next stage matches affected by current stage change
            while (!!currentMatch) {
              const nextMatchResult = await client.query(
                `
                SELECT
                  m.id as _id,
                  *
                FROM
                  knockout_tournament.matches AS m
                WHERE
                  tournament_id = $1::BIGINT
                AND
                  stage_number = $2::SMALLINT
                AND
                  match_number = $3::SMALLINT
              `,
                [
                  currentMatch.tournament_id,
                  Number(currentMatch.stage_number) + 1,
                  Math.floor(Number(currentMatch.match_number / 2)),
                ]
              );

              if (nextMatchResult.rows.length !== 1) {
                break;
              }

              const nextMatch = nextMatchResult.rows[0];
              const updateNextMatchResult = await client.query(
                `
                  UPDATE
                    knockout_tournament.matches
                  SET
                    ${
                      isEven(Number(currentMatch.match_number))
                        ? "participant_1_id"
                        : "participant_2_id"
                    } = $1::BIGINT ${
                  currentMatchWinner === 0 ? ", winner = '0'::CHAR" : ""
                }
                  WHERE
                    id = $2::BIGINT
                  RETURNING
                    id as _id,
                    *
                `,
                [
                  currentMatchWinner === 0
                    ? undefined
                    : currentMatchWinner === 1
                    ? currentMatch.participant_1_id
                    : currentMatch.participant_2_id,
                  nextMatch._id,
                ]
              );

              const updateNextMatch = updateNextMatchResult.rows[0];
              returnPayload.push(updateNextMatch);
              currentMatch = updateNextMatch;
              currentMatchWinner = Number(updateNextMatch.winner);
            }

            release();
            if (updateMatchResult.rows.length < 1) {
              return reply.code(400).send("Error????");
            }
            return reply.code(200).send(returnPayload);
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
