import type { PoolClient, QueryResult } from "pg";

/**
 *
 * @param actionId the action's id within the authentication.action
 * @param request
 * @param reply
 * @param client
 * @param release
 * @param onSuccess
 */
export const verifyPermission = (
  actionId: number,
  request: any,
  reply: any,
  client: PoolClient,
  release: any,
  onSuccess: () => void
) => {
  const { _id } = request.user;

  client.query(
    `
    SELECT
      COUNT (ra.role_id)
    FROM
      authentication.users AS u
    LEFT JOIN
      authentication.users_roles AS ur
    ON
      u.id = ur.user_id
    LEFT JOIN
      authentication.roles_actions AS ra
    ON
      ur.role_id = ra.role_id
    WHERE
      ra.action_id = $1::SMALLINT
    AND
      u.id = $2::BIGINT
  `,
    [actionId, _id],
    (err: Error, result: QueryResult<any>) => {
      if (err) {
        release();
        return reply.code(400).send(err.message);
      }

      if (result.rows[0].count < 1) {
        release();
        return reply.code(400).send("No permission");
      }

      onSuccess();
    }
  );
};
