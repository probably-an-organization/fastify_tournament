import { FastifyInstance } from "fastify/types/instance";
import { hashCompare } from "../../utils/hashUtils";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { APP_ORIGIN } from "../../configs/setupConfig";
import type { PoolClient } from "pg";

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
    type: "string",
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
export default async function login(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  const routeOptions = {
    schema: {
      body: bodyJsonSchema,
      response: responseJsonSchema,
    },
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .post("/login", routeOptions, (request, reply): void => {
      const { email, password } = request.body;

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            const result = await client.query(
              `
              SELECT
                u.id AS _id,
                u.username,
                u.password,
                u.verified
              FROM
                authentication.users AS u
              WHERE
                u.email = $1::VARCHAR
            `,
              [email]
            );
            release();

            if (result.rowCount !== 1) {
              return reply.code(400).send("User not found");
            }

            const userData: {
              _id: number;
              username: string;
              password: string;
              verified: boolean;
            } = result.rows[0];

            if (await hashCompare(password, userData.password)) {
              const token: string = await reply.jwtSign(
                {
                  _id: userData._id,
                },
                {
                  expiresIn: "1h",
                }
              );

              return reply
                .code(200)
                .header("Access-Control-Allow-Credentials", "true")
                .header("Access-Control-Allow-Headers", "*")
                .header("Access-Control-Allow-Origin", APP_ORIGIN)
                .header("Content-Type", "application/json; charset='uft8'")
                .setCookie("token", token, {
                  domain: "192.168.1.152",
                  path: "/",
                  secure: false, // TODO set to TRUE asap (https required)
                  httpOnly: true,
                  sameSite: "lax",
                })
                .send("Success");
            }
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
