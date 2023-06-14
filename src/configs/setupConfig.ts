import { getEnvironmentVariable } from "../utils/envUtil";

export const JWT_SECRET: string = getEnvironmentVariable("JWT_SECRET");
export const APP_ORIGIN: string = getEnvironmentVariable("APP_ORIGIN");
