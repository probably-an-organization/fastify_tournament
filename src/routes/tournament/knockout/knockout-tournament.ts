import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";

const paramsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutTournament(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      // body: {},
      // querystring: {},
      params: paramsJsonSchema,
      // header: {},
      // response: {},
    },
    // ...
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/knockout-tournament/:id", routeOptions, (request, reply): void => {
      const { id } = request.params;
      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) return reply.code(400).send(err);

        client.query(
          `
            SELECT
              a.tournament_id,
              a.name,
              a.participants
            FROM
              knockout_tournament.tournaments AS a
            WHERE
              a.tournament_id = $1::BIGINT
          `,
          [id],
          (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err);
            }
            if (result) {
              reply.code(200).send(result.rows[0]);
            } else {
              reply.code(400).send("No knockout tournament found");
            }
          }
        );
      });
    });
}
