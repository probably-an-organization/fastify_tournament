import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import { verifyTournamentUserPermission } from "../../utils/fastify-pg/pgTournamentUserPermissionUtils";
import type { PoolClient } from "pg";

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
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function knockoutSocketTest(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      params: paramsJsonSchema,
    },
    onRequest: [fastify.authenticate],
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get(
      "/knockout-tournament/:id/socket",
      routeOptions,
      (request, reply): void => {
        // TODO verify admin permission
        const { id } = request.params;
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

        fastify.io.of(`/knockout-tournament-${id}`).emit("newIncomingMessage", {
          author: "SERVER",
          message: "HELLO",
        });
        reply.code(200).send("Test message successfully emitted");
      }
    );
}
