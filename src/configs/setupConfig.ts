import { getEnvironmentVariable } from "../utils/envUtils";

export const JWT_SECRET: string = getEnvironmentVariable("JWT_SECRET");

export const APP_DOMAIN: string = getEnvironmentVariable("APP_DOMAIN");
export const APP_PORT: string = getEnvironmentVariable("APP_PORT");
export const APP_ORIGIN: string = "http://" + APP_DOMAIN + ":" + APP_PORT;
