import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function models(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {};

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/premium/models", routeOptions, (request, reply): void => {
      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err);
          }
          try {
            const result = await client.query(`
							SELECT
								pm.id AS _id,
								pm.*
							FROM
								premium.models AS pm
            `);
            release();
            return reply.code(200).send(result.rows);
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
