import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { createKnockoutMatches } from "../../../utils/fastify/pgKnockoutTournamentUtils";
import { verifyPermission } from "../../../utils/fastify/pgPermissionUtils";
import { hasUniqueNumbers } from "../../../utils/arrayUtils";

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
    .post("/knockout-edit-match/:id", routeOptions, (request, reply): void => {
      const { id } = request.params;
      const { status, date, participant_1_id, participant_2_id, winner } =
        request.body;
      const { _id } = request.user;

      reply.code(200).send();
      return;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            await verifyPermission(1, _id, client);
            // const result = await client.query(``);

            release();
            return reply.code(400).send("TOdOOOooO");
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
