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
      const json = JSON.parse(String(body));
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

fastify.register(fastifyCookie);

fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
  // sign: {
  //   expiresIn: "30min",
  // },
});

// used for onRequest (making a valid jwt a requirement for the request)
fastify.decorate("authenticate", async (request: any, reply: any) => {
  try {
    return await request.jwtVerify(request.cookies.token);
  } catch (err) {
    return reply.code(401).send(err);
  }
});

// used for manual retrieval of user token (within a call)
fastify.decorate("decodeUserToken", async (request: any) => {
  try {
    return await request.jwtVerify(request.cookies.token);
  } catch (err) {
    throw Error(err as string);
  }
});

fastify.register(fastifyCors, {
  credentials: true,
  optionsSuccessStatus: 200,
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
 * CUSTOM PLUGIN (socket.io)
 * * * * * * * * * * * * * * * * * * * */

import { Server, Socket } from "socket.io";

const socketIO = new Server(fastify.server, {
  cors: {
    origin: APP_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: [],
    // credentials: true
  },
});

fastify.decorate("io", socketIO);

fastify.addHook("onClose", (fastify, done) => {
  fastify.io.close();
  done();
});

fastify.ready(() => {
  fastify.io.on("connect", (socket: Socket) => {
    console.info("[Socket ID:", socket.id, "] Client connected!");
    console.info("Total clients:", fastify.io.engine.clientsCount);

    socket.on("disconnect", () => {
      console.info("[Socket ID:", socket.id, "] Client disconnected!");
      console.info("Total clients:", fastify.io.engine.clientsCount);
    });

    socket.on("createdMessage", (msg) => {
      socket.broadcast.emit("newIncomingMessage", msg);
    });
  });
});

// test
fastify.get("/socket", (request, reply) => {
  fastify.io.emit("newIncomingMessage", {
    author: "SERVER",
    message: "HELLO",
  });
  return reply.code(200).send("Test message successfully emitted");
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
import { verifyMail } from "./src/utils/mailUtils";

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
