export enum EnvironmentType {
  Boolean = "BOOLEAN",
  String = "STRING",
  Number = "NUMBER",
}
export function getEnvironmentVariable(variable: string): string;
export function getEnvironmentVariable(
  variable: string,
  type: EnvironmentType.Boolean
): boolean;
export function getEnvironmentVariable(
  variable: string,
  type: EnvironmentType.Number
): number;

export function getEnvironmentVariable(
  variable: string,
  type: EnvironmentType = EnvironmentType.String
): boolean | string | number {
  const value: string | undefined = process.env[variable];
  if (!value) {
    throw new Error(
      `[src/utils/envUtils.ts] Could not find environment variable ${variable}`
    );
  }

  switch (type) {
    case EnvironmentType.String: {
      return value;
    }
    case EnvironmentType.Number: {
      return parseInt(value);
    }
    case EnvironmentType.Boolean: {
      switch (value) {
        case "true":
        case "1":
        case "on":
        case "yes":
          return true;
        default:
          return false;
      }
    }
  }
}
