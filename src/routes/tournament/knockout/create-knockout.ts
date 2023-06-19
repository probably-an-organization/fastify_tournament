import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";

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

      // TODO check user role & permission
      if (request.user.roleId === null) {
        reply.code(400).send("No permission");
        return;
      }

      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) reply.code(400).send(err.message);

        client.query(
          `
            WITH new_tournament AS (
              INSERT INTO
                knockout_tournament.tournaments (name, participants)
              VALUES
                ($1::VARCHAR)
              RETURNING
                tournament_id,
                name,
                participants
            ),
            new_participants AS (
              INSERT INTO
                knockout_tournament.participants (tournament_id, name, team)
              VALUES ${participants.map(
                (p) =>
                  `((SELECT tournament_id FROM new_tournament), '${p.name}'::VARCHAR, '${p.team}'::VARCHAR)`
              )}
              RETURNING
                participant_id AS _id,
                name,
                team
            )
            SELECT
                t.tournament_id AS _id,
                t.name AS name,
                jsonb_agg(p) AS participants
            FROM
              new_tournament as t,
              new_participants as p
            GROUP BY
              t.tournament_id,
              t.name
          `,
          [name],
          (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err.message);
            }

            reply.code(200).send(result.rows[0]);
          }
        );
      });
    });
}
