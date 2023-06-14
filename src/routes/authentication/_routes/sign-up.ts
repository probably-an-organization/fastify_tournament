import { FastifyInstance } from "fastify/types/instance";
import { hashString } from "../../../utils/hashUtil";
import { generateToken } from "../../../utils/tokenUtil";
import { sendMail } from "../../../utils/mailUtil";
import { APP_ORIGIN } from "../../../configs/setupConfig";

const SCHEMA = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        username: { type: "string" },
        email: { type: "string" },
        password: { type: "string" },
        roleId: { type: ["number", "null"], default: null },
      },
      required: ["username", "email", "password"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
};

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function signUp(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.post("/sign-up", SCHEMA, async (request: any, reply): Promise<void> => {
    const { username, email, password, roleId } = request.body;
    var hashedPassword = await hashString(password);
    var token = generateToken(30); // TODO not collision-free

    const client = await fastify.pg.connect();
    try {
      const result = await client.query(
        `
              WITH data (username, email, password, token, role_id) AS (
                VALUES
                  ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::INTEGER)
              ),
              create_user AS (
                INSERT INTO
                  private.users (username, email, password, role_id)
                SELECT
                  d.username,
                  d.email,
                  d.password,
                  d.role_id
                FROM
                  data AS d
                ON CONFLICT DO NOTHING
                RETURNING
                  user_id,
                  username
              )
              INSERT INTO
                private.verifications (user_id, token)
              SELECT
                create_user.user_id,
                d.token
              FROM
                data AS d
              JOIN
                create_user
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
      if (result.rowCount > 0) {
        sendMail({
          from: '"Development" <yan.development@outlook.com>',
          to: email,
          subject: "validate account",
          text: `validate account: ${APP_ORIGIN}/user-verification?${token}`,
          html: `<p>validate account: ${APP_ORIGIN}/user-verification?${token}</p>`,
        });
        reply.code(200).send("success");
      } else {
        reply.code(400).send("username or email taken");
      }
    } catch (error) {
      reply.code(400).send(error);
    } finally {
      client.release();
    }
  });
}
