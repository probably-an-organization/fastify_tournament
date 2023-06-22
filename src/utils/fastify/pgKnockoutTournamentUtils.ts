import type { PoolClient } from "pg";

/**
 * @param tournament
 * @param request
 * @param reply
 * @param client
 * @param release
 * @param onSuccess
 */
export const createKnockoutMatches = async (
  tournament: {
    _id: number;
    name: string;
    participants: {
      _id: number;
      name: string;
      team: string;
    }[];
  },
  client: PoolClient
): Promise<object | undefined> => {
  var matches = [];
  var currentStageMatches: number = Math.ceil(
    tournament.participants.length / 2
  );
  var currentStageNumber: number = 0;
  while (currentStageMatches >= 1) {
    const result = await client.query(
      `
          INSERT INTO
            knockout_tournament.matches (tournament_id, participant_1_id, participant_2_id, match_number, stage_number)
          VALUES
            ${Array.from({
              length: currentStageMatches,
            }).map(
              (_, i) => `(
              '${tournament._id}'::BIGINT,
              ${
                currentStageNumber === 0 && tournament.participants[i * 2]
                  ? `'${tournament.participants[i * 2]._id}'::BIGINT`
                  : "NULL"
              },
              ${
                currentStageNumber === 0 && tournament.participants[i * 2 + 1]
                  ? `'${tournament.participants[i * 2 + 1]._id}'::BIGINT`
                  : "NULL"
              },
              '${i}'::SMALLINT,
              '${currentStageNumber}'::SMALLINT
            )`
            )}
          RETURNING
            id AS _id,
            tournament_id
        `
    );
    matches.push(result.rows);
    currentStageMatches = currentStageMatches / 2;
    currentStageNumber++;
  }

  return matches;
};
