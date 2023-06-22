import type { PoolClient } from "pg";

/**
 *
 * @param actionId the action's id within the authentication.action
 * @param request
 * @param reply
 * @param client
 * @param release
 */
export const verifyPermission = async (
  actionId: number,
  request: any,
  client: PoolClient
): Promise<void> => {
  // get token (from cookies), decode
  const { _id } = await request.jwtVerify(request.cookies.token);
  if (!_id) {
    throw Error("No authentication token");
  }

  const result = await client.query(
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
    [actionId, _id]
  );

  if (result.rows[0].count < 1) {
    throw Error("No permission");
  }
};
