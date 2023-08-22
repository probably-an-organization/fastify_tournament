import type { PoolClient } from "pg";

/**
 *
 * @param actionId the action's id within the authentication.action
 * @param userId the user's id
 * @param client postgres pool client
 */
export const verifyPermission = async (
  actionId: number | string,
  userId: number | string,
  client: PoolClient
): Promise<void> => {
  const result = await client.query(
    `
      SELECT
        COUNT (ra.role_id)
      FROM
        authentication.users AS u
      LEFT JOIN
        authentication.roles_users AS ur
      ON
        u.id = ur.user_id
      LEFT JOIN
        authentication.actions_roles AS ra
      ON
        ur.role_id = ra.role_id
      WHERE
        ra.action_id = $1::SMALLINT
      AND
        u.id = $2::BIGINT
    `,
    [actionId, userId]
  );

  if (result.rows.length !== 1) {
    throw Error("No permission");
  }
};
