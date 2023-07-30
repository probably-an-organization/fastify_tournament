import { FastifyInstance } from "fastify/types/instance";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import type { PoolClient } from "pg";
import addDays from "date-fns/addDays";
import getUnixTime from "date-fns/getUnixTime";

import { APP_DOMAIN, APP_ORIGIN } from "~src/configs/setupConfig";
import { hashCompare } from "~src/utils/hashUtils";

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
    additionalProperties: false,
    properties: {
      email: { type: "string" },
      username: { type: "string" },
      verified: { type: "boolean" },
    },
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
                u.email,
                u.password,
                u.username,
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
              return reply.code(401).send("User not found");
            }

            const userData: {
              _id: number;
              username: string;
              password: string;
              verified: boolean;
            } = result.rows[0];

            if (!(await hashCompare(password, userData.password))) {
              return reply.code(401).send("Wrong credentials");
            }

            const token: string = await reply.jwtSign(
              {
                _id: userData._id,
              },
              {
                expiresIn: "30d",
              }
            );

            return reply
              .code(200)
              .header("Access-Control-Allow-Credentials", "true")
              .header("Access-Control-Allow-Headers", "*")
              .header("Access-Control-Allow-Origin", APP_ORIGIN)
              .header("Content-Type", "application/json; charset='uft8'")
              .setCookie("token", token, {
                domain: APP_DOMAIN,
                httpOnly: true,
                maxAge: getUnixTime(addDays(Date.now(), 30)),
                path: "/",
                sameSite: "lax",
                secure: false, // TODO set to TRUE asap (https required)
              })
              .send({
                email: result.rows[0].email,
                username: result.rows[0].username,
                verified: result.rows[0].verified,
              });
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
