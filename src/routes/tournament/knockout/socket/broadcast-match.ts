import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import { verifyTournamentUserPermission } from "../../../../utils/fastify/pgTournamentUserPermissionUtils";
import type { PoolClient } from "pg";

const paramsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    matchNumber: { type: "number" },
    stageNumber: { type: "number" },
  },
  required: ["id"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    properties: {
      matchNumber: { type: "number" },
      stageNumber: { type: "number" },
    },
  },
  400: {
    type: "string",
  },
};

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutSocketBroadcastMatch(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      params: paramsJsonSchema,
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate],
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get(
      "/knockout-tournament/:id/broadcast/:stageNumber/:matchNumber",
      routeOptions,
      (request, reply): void => {
        const { id, matchNumber, stageNumber } = request.params;
        const { _id } = request.user;

        fastify.pg.connect(
          async (err: Error, client: PoolClient, release: any) => {
            if (err) {
              release();
              return reply.code(400).send(err.message);
            }
            try {
              await verifyTournamentUserPermission(id, _id, client);
              release();
            } catch (err) {
              release();
              return reply.code(400).send(err as string);
            }
          }
        );

        console.info("==========");
        console.info(
          `[/knockout-tournament-${id}] Setting broadcast match to ${stageNumber} (stage), ${matchNumber} (match)`
        );
        fastify.io
          .of(`/knockout-tournament-${id}`)
          .to("match-room")
          .emit("broadcast-match", {
            stageNumber,
            matchNumber,
          });
        reply.code(200).send("Broadcast message successfully emitted");
      }
    );
}