import { EnvironmentType, getEnvironmentVariable } from "../utils/envUtils";

export const BCRYPT_SALT_ROUNDS: number = getEnvironmentVariable(
  "BCRYPT_SALT_ROUNDS",
  EnvironmentType.Number
);
