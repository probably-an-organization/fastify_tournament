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
  reply: any,
  client: PoolClient,
  release: any
): Promise<boolean> => {
  const { _id } = request.user;

  try {
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
      release();
      reply.code(400).send("No permission");
      return false;
    }
    return true;
  } catch (err) {
    release();
    reply.code(400).send(err);
    return false;
  }
};
