import { getEnvironmentVariable } from "../utils/envUtils";

export const JWT_SECRET: string = getEnvironmentVariable("JWT_SECRET");
export const APP_ORIGIN: string = getEnvironmentVariable("APP_ORIGIN");
