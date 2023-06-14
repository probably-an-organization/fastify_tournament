import { FastifyInstance } from "fastify/types/instance";
import { hashCompare } from "../../../utils/hashUtil";

const SCHEMA = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        email: { type: "string" },
        password: { type: "string" },
      },
      required: ["email", "password"],
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
export default async function login(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.post("/login", SCHEMA, async (request: any, reply): Promise<void> => {
    const { email, password } = request.body;

    const client = await fastify.pg.connect();
    try {
      const result = await client.query(
        `
              WITH data (email) AS (
                VALUES
                  ($1::VARCHAR)
              )
              SELECT
                a.username,
                a.password,
                a.verified,
                a.role_id
              FROM
                private.users AS a,
                data AS d
              WHERE a.email = d.email
            `,
        [email]
      );
      if (result.rowCount > 0) {
        const userData: { username: string; password: string; verified: boolean; role_id: number } =
          result.rows[0];
        if (await hashCompare(password, userData.password)) {
          const token: string = fastify.jwt.sign(
            {
              username: userData.username,
              verified: userData.verified,
              roleId: userData.role_id,
            },
            {
              expiresIn: "1min",
            }
          );
          reply.code(200).send(token);
        } else {
          reply.code(400).send("wrong password");
        }
      } else {
        reply.code(400).send("user not found");
      }
    } catch (error) {
      reply.code(400).send(error);
    } finally {
      client.release();
    }
  });
}
