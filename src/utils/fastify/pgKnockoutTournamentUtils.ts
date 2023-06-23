import type { PoolClient } from "pg";

/**
 * Function to create the knockout matches according to the provided tournament data
 * @param tournament
 * @param client
 * @param lineups
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
  client: PoolClient,
  lineups?: [number, number][]
): Promise<object | undefined> => {
  const getRowValue = (
    p1Id: number | null,
    p2Id: number | null,
    matchNumber: number,
    stageNumber: number
  ) =>
    `(
    '${tournament._id}'::BIGINT,
    ${p1Id ? `'${p1Id}'::BIGINT` : "NULL"},
    ${p2Id ? `'${p2Id}'::BIGINT` : "NULL"},
    '${matchNumber}'::SMALLINT,
    '${stageNumber}'::SMALLINT
  )`;

  const matches = [];
  let currentStageNumber = 0;
  let currentStageMatches = Math.ceil(tournament.participants.length / 2);
  if (currentStageNumber === 0 && lineups) {
    const result = await client.query(
      `
        INSERT INTO
          knockout_tournament.matches (
            tournament_id,
            participant_1_id,
            participant_2_id,
            match_number,
            stage_number
          )
        VALUES
          ${lineups.map((l, i) =>
            getRowValue(
              tournament.participants[l[0]]._id ?? null,
              tournament.participants[l[1]]._id ?? null,
              i,
              currentStageNumber
            )
          )}
        RETURNING
          id AS _id,
          tournament_id,
          participant_1_id,
          participant_2_id,
          match_number,
          stage_number
      `
    );
    matches.push(result.rows);
    currentStageMatches /= 2;
    currentStageNumber++;
  }
  while (currentStageMatches >= 1) {
    const result = await client.query(
      `
          INSERT INTO
            knockout_tournament.matches (
              tournament_id,
              participant_1_id,
              participant_2_id,
              match_number,
              stage_number
            )
          VALUES
            ${Array.from({
              length: currentStageMatches,
            }).map((_, i) =>
              getRowValue(
                currentStageNumber === 0 && !lineups
                  ? tournament.participants[i * 2]._id ?? null
                  : null,
                currentStageNumber === 0 && !lineups
                  ? tournament.participants[i * 2 + 1]._id ?? null
                  : null,
                i,
                currentStageNumber
              )
            )}
          RETURNING
            id AS _id,
            tournament_id,
            participant_1_id,
            participant_2_id,
            match_number,
            stage_number
        `
    );
    matches.push(result.rows);
    currentStageMatches /= 2;
    currentStageNumber++;
  }

  return matches;
};
