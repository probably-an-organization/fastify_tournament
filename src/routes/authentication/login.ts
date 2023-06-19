import { FastifyInstance } from "fastify/types/instance";
import { hashCompare } from "../../utils/hashUtil";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import type { PoolClient, QueryResult } from "pg";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    email: { type: "string" },
    password: { type: "string" },
  },
  required: ["email", "password"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    properties: {
      token: { type: "string" },
    },
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
      // querystring: {},
      // params: {},
      // header: {},
      response: responseJsonSchema,
    },
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .post("/login", routeOptions, (request, reply): void => {
      const { email, password } = request.body;

      fastify.pg.connect((err: Error, client: PoolClient, release: any) => {
        if (err) reply.code(400).send(err.message);

        client.query(
          `
            SELECT
              a.user_id,
              a.username,
              a.password,
              a.verified,
              a.role_id
            FROM
              authentication.users AS a
            WHERE a.email = $1
          `,
          [email],
          async (err: Error, result: QueryResult<any>) => {
            release();
            if (err) {
              return reply.code(400).send(err.message);
            }
            if (result.rowCount !== 1) {
              reply.code(400).send("User not found");
            }
            const userData: {
              user_id: number;
              username: string;
              password: string;
              verified: boolean;
              role_id: number;
            } = result.rows[0];
            if (await hashCompare(password, userData.password)) {
              const token: string = fastify.jwt.sign(
                {
                  userId: userData.user_id,
                  roleId: userData.role_id,
                },
                {
                  expiresIn: "5min",
                }
              );
              reply.code(200).send({ token });
            } else {
              reply.code(400).send("Wrong credentials");
            }
          }
        );
      });
      /* async */
      // return reply
    });
}
