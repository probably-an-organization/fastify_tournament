import type { PoolClient } from "pg";

/**
 *
 * @param tournamentId the tournament's id
 * @param userId the user's id
 * @param client postgres pool client
 * @returns {boolean} true if verified
 */
export const verifyTournamentUserPermission = async (
  tournamentId: number | string,
  userId: number | string,
  client: PoolClient
): Promise<boolean> => {
  const result = await client.query(
    `
    SELECT
      *
    FROM
      knockout_tournament.tournaments_users
    WHERE
      tournament_id = $1::BIGINT
    AND
      user_id = $2::BIGINT
  `,
    [tournamentId, userId]
  );

  return result.rows.length === 1;
};
