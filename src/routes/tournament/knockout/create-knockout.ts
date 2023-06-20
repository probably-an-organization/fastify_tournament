import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";
import { verifyPermission } from "../../../utils/fastifyUtil";

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

const headerJsonSchema = {
  type: "object",
  properties: {
    authorization: { type: "string" },
  },
  required: ["authorization"],
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
      headers: headerJsonSchema,
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate], // fastify-jwt
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .post("/create-knockout", routeOptions, (request, reply): void => {
      const { name, participants } = request.body;

      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) reply.code(400).send(err.message);

        verifyPermission(1, request, reply, client, release, () => {
          client.query(
            `
          WITH permission AS (
            SELECT
              COUNT (ra.role_id)
            FROM
              authentication.users AS u
            LEFT JOIN
              authentication.users_roles AS ur
            ON
              u.id = ur.user_id
            LEFT JOIN
              authentication.roles_actions AS ra
            ON
              ur.role_id = ra.role_id
            WHERE
              ra.action_id = 1
          ),
          new_tournament AS (
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
        `,
            (err: Error, result: QueryResult<any>) => {
              if (err) {
                release();
                return reply.code(400).send(err.message);
              }

              const tournament = result.rows[0];

              // TODO currently only generates the first stage! (e.g. top 8 -> first 8 matches)
              client.query(
                `
                INSERT INTO
                  knockout_tournament.matches (tournament_id, status, participant_1_id, participant_2_id, winner, match_number)
                VALUES ${Array.from({
                  length: Math.ceil(tournament.participants.length / 2),
                }).map(
                  (_, i) => `(
                  '${tournament._id}'::BIGINT,
                  'future'::knockout_tournament.match_status_types,
                  '${tournament.participants[i]._id}'::BIGINT,
                  ${
                    tournament.participants[i + 1]
                      ? `'${tournament.participants[i + 1]._id}'::BIGINT`
                      : "NULL"
                  },
                  '0'::CHAR,
                  '${i}'::SMALLINT
                )`
                )}
              `,
                (err2: Error, result2: QueryResult<any>) => {
                  if (err2) {
                    release();
                    return reply.code(400).send(err2.message);
                  }

                  reply.code(200).send(tournament);
                }
              );
            }
          );
        });
      });
    });
}
