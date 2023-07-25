import { getEnvironmentVariable } from "../utils/envUtils";

export const JWT_SECRET = getEnvironmentVariable("JWT_SECRET");

export const APP_DOMAIN = getEnvironmentVariable("APP_DOMAIN");
export const APP_PORT = getEnvironmentVariable("APP_PORT");
export const APP_ORIGIN = "http://" + APP_DOMAIN + ":" + APP_PORT;
