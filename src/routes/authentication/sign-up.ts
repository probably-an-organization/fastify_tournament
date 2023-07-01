import { FastifyInstance } from "fastify/types/instance";
import { hashString } from "../../utils/hashUtils";
import { generateToken } from "../../utils/tokenUtils";
import { sendMail } from "../../utils/mailUtils";
import { APP_ORIGIN } from "../../configs/setupConfig";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import type { PoolClient } from "pg";

const bodyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    username: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    roleId: { type: ["number", "null"], default: null },
  },
  required: ["username", "email", "password"],
} as const;

const responseJsonSchema = {
  200: {
    type: "object",
    properties: {
      message: { type: "string" },
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
export default async function signUp(
  fastify: FastifyInstance,
  options: object
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
    .post("/sign-up", routeOptions, async (request, reply) => {
      const { username, email, password, roleId } = request.body;

      const hashedPassword = await hashString(password);
      const token = generateToken(30); // TODO not collision-free

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            const result = await client.query(
              `
            WITH data (username, email, password, token, role_id) AS (
              VALUES
                ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::INTEGER)
            ),
            new_user AS (
              INSERT INTO
                authentication.users (username, email, password)
              SELECT
                d.username,
                d.email,
                d.password
              FROM
                data AS d
              ON CONFLICT DO NOTHING
              RETURNING
                id,
                username
            )
            INSERT INTO
              authentication.verifications (user_id, token)
            SELECT
              u.id,
              d.token
            FROM
              data AS d
            JOIN
              new_user AS u
            USING (username)
            ON CONFLICT (user_id) DO UPDATE
            SET
              token = EXCLUDED.token
            RETURNING
              user_id,
              token
          `,
              [username, email, hashedPassword, token, roleId]
            );
            release();

            if (result.rowCount === 1) {
              sendMail({
                from: '"Development" <yan.development@outlook.com>',
                to: email,
                subject: "Validate account",
                text: `Validate account: ${APP_ORIGIN}/user-verification?${token}`,
                html: `<p>Validate account: ${APP_ORIGIN}/user-verification?${token}</p>`,
              });
              return reply.code(201).send({ message: "Success" });
            } else {
              return reply.code(400).send("Username or email already in use");
            }
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
