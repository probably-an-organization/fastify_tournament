import { FastifyInstance } from "fastify/types/instance";

const SCHEMA = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        token: { type: "string" },
      },
      required: ["token"],
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
export default async function userVerification(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  fastify.post("/user-verification", SCHEMA, async (request: any, reply): Promise<void> => {
    const { token } = request.body;

    const client = await fastify.pg.connect();
    try {
      const result = await client.query(
        `
              WITH data (token) AS (
                VALUES
                  ($1::VARCHAR)
              ),
              validate_user AS (
                UPDATE
                  private.users AS a
                SET
                  verified = true
                FROM
                  private.verifications AS b,
                  data AS d
                WHERE
                  b.token = d.token
                AND
                  b.user_id = a.user_id
                RETURNING
                  a.user_id
              )
              DELETE FROM
                private.verifications AS b
              USING
                validate_user AS c
              WHERE
                c.user_id = b.user_id;
            `,
        [token]
      );
      if (result.rowCount > 0) {
        reply.code(200).send("user successfully verified");
      } else {
        reply.code(400).send("error, no verifications entry found");
      }
    } catch (error) {
      reply.code(400).send(error);
    } finally {
      client.release();
    }
  });
}
