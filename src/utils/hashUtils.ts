import bcrypt from "bcrypt";

import { BCRYPT_SALT_ROUNDS } from "../configs/bcryptConfig";

export async function hashString(string: string): Promise<string> {
  const hashedString: string = await new Promise((resolve, reject) => {
    bcrypt.hash(string, BCRYPT_SALT_ROUNDS, (error, hash) => {
      if (error) reject(error);
      resolve(hash);
    });
  });
  return hashedString;
}

export async function hashCompare(
  string: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(string, hash);
}
