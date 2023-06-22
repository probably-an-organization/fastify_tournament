import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    foo: { type: "string" },
    bar: { type: "number" },
  },
  required: ["foo"],
} as const;

const querystringJsonSchema = {
  type: "object",
  properties: {
    foo: { type: "string" },
  },
} as const;

const paramsJsonSchema = {
  type: "object",
  properties: {
    param1: { type: "string" },
    param2: { type: "number" },
  },
} as const;

const headersJsonSchema = {
  type: "object",
  properties: {
    "x-foo": { type: "string" },
  },
  required: ["x-foo"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    properties: {
      message: { type: "string" },
    },
    required: ["message"],
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
export default async function login(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      body: bodyJsonSchema,
      // querystring: querystringJsonSchema,
      // params: paramsJsonSchema,
      // header: headerJsonSchema,
      response: responseJsonSchema,
    },
    // onRequest: [fastify.authenticate] // fastify.decorate("/authenticate", ...)
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .post(
      "/__template",
      routeOptions,
      async (request, reply): Promise<void> => {
        const { foo, bar } = request.body;

        fastify.pg.connect(
          async (err: Error, client: PoolClient, release: any) => {
            if (err) {
              release();
              return reply.code(400).send(err.message);
            }

            try {
              const result = await client.query(
                "SELECT tournament_id, name, participants FROM knockout_tournament.tournaments"
              );
              release();
              return reply
                .code(200)
                .send({ message: `Found ${result.rows.length} results` });
            } catch (err) {
              release();
              return reply.code(400).send(err as string);
            }
          }
        );
      }
    );
}
