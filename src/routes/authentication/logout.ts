import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyInstance } from "fastify/types/instance";
import type { PoolClient } from "pg";
import { APP_ORIGIN } from "../../configs/setupConfig";

const responseJsonSchema = {
  400: {
    type: "string",
  },
} as const;

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function logout(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  const routeOptions = {
    schema: {
      response: responseJsonSchema,
    },
    onRequest: [fastify.authenticate],
  };

  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()
    .get("/logout", routeOptions, (request, reply): void => {
      const { _id } = request.user;

      if (!_id) {
        reply.code(400).send("No authentication token");
        return;
      }

      fastify.pg.connect(
        async (err: Error, client: PoolClient, release: any) => {
          if (err) {
            release();
            return reply.code(400).send(err.message);
          }

          try {
            // TODO make a query once sessions are in database?

            // const result = await client.query(
            //   `
            //   SELECT
            //     t.id as _id,
            //     t.name,
            //     COUNT(p.tournament_id) AS participants
            //   FROM
            //     knockout_tournament.tournaments AS t
            //   INNER JOIN
            //     knockout_tournament.tournaments_users AS tu
            //   ON
            //     t.id = tu.tournament_id
            //   LEFT JOIN
            //     knockout_tournament.participants AS p
            //   ON
            //     t.id = p.tournament_id
            //   WHERE
            //     tu.user_id = $1::BIGINT
            //   GROUP BY
            //     t.id
            // `,
            //   [_id]
            // );
            release();

            return reply
              .code(200)
              .setCookie("token", "", {
                //domain: "https://wherethemtools.at",
                path: "/",
                secure: true,
                httpOnly: true,
                sameSite: "lax",
                expires: new Date(),
              })
              .send("Success");
          } catch (err) {
            release();
            return reply.code(400).send(err as string);
          }
        }
      );
    });
}
