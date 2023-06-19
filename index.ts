import * as dotenv from "dotenv";
dotenv.config();

/* * * * * * * * * * * * * * * * * * * *
 * FASTIFY & DEFAULT PLUGINS
 * * * * * * * * * * * * * * * * * * * */
import fastifyCore from "fastify";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { JWT_SECRET, APP_ORIGIN } from "./src/configs/setupConfig";
import {
  FASTIFY_CONFIG,
  FASTIFY_PG_CONNECTION_STRING,
} from "./src/configs/fastifyConfig";

/* * * * * * * * * * * * * * * * * * * *
 * FASTIFY SETUP
 * * * * * * * * * * * * * * * * * * * */
const fastify = fastifyCore(FASTIFY_CONFIG);

fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    try {
      var json: string = JSON.parse(String(body));
      done(null, json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        done(err, undefined);
      }
    }
  }
);

fastify.register(fastifyPostgres, {
  connectionString: FASTIFY_PG_CONNECTION_STRING,
});

fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
});

fastify.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

fastify.register(fastifyCookie);

fastify.register(fastifyCors, {
  methods: "GET,PUT,POST,DELETE,OPTIONS",
  origin: (origin, callback) => {
    if (origin === APP_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error("[CORS]: not allowed"), false);
    }
  },
});

/* * * * * * * * * * * * * * * * * * * *
 * CUSTOM ROUTING
 * https://github.com/fastify/fastify-example-twitter/tree/master/tweet
 * * * * * * * * * * * * * * * * * * * */
import routes from "./src/routes";

fastify.register(routes);

/* * * * * * * * * * * * * * * * * * * *
 * CUSTOM INITIALIZATION
 * * * * * * * * * * * * * * * * * * * */
import { verifyMail } from "./src/utils/mailUtil";

async function initialize() {
  console.log("[/src/index.ts] initializing...");
  if (!(await verifyMail())) {
    return false;
  }
  return true;
}

/* * * * * * * * * * * * * * * * * * * *
 * APP
 * * * * * * * * * * * * * * * * * * * */
initialize().then((success) => {
  if (success) {
    console.log("[/src/index.ts] successfully initialized");
    fastify.listen({ port: 8080 }, (err, address) => {
      if (err) {
        console.error("[/src/index.ts]:", err);
        process.exit(1);
      }
      console.log(`[/src/index.ts] server listening at ${address}`);
    });
  } else {
    console.error("[/src/index.ts] unsuccessfully inizialized");
  }
});
