import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient, QueryResult } from "pg";

const querystringJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    token: { type: "string" },
  },
  required: ["token"],
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
export default async function userVerification(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      // body: bodyJsonSchema,
      querystring: querystringJsonSchema,
      //params: paramsJsonSchema,
      // headers: headersJsonSchema,
      response: responseJsonSchema,
    },
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/user-verification", routeOptions, (request, reply): void => {
      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) reply.code(400).send(err.message);

        client.query(
          `
            WITH data (token) AS (
              VALUES
                ($1::VARCHAR)
            ),
            validate_user AS (
              UPDATE
                authentication.users AS u
              SET
                verified = true
              FROM
                authentication.verifications AS v,
                data AS d
              WHERE
                v.token = d.token
              AND
                v.user_id = u.id
              RETURNING
                u.id
            )
            DELETE FROM
              authentication.verifications AS v
            USING
              validate_user AS vu
            WHERE
              vu.id = v.user_id;
          `,
          [request.query.token],
          (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err.message);
            }

            if (result.rowCount === 1) {
              reply.code(200).send({ message: "User successfully verified" });
            } else {
              reply.code(400).send("Error, no verifications entry found");
            }
          }
        );
      });
      /* async */
      // return reply;
    });
}
