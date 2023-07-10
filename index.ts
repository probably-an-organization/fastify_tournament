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
import fastifyRateLimit from "@fastify/rate-limit";

import { APP_ORIGIN } from "./src/configs/setupConfig";
import {
  FASTIFY_CONFIG,
  FASTIFY_COOKIE_CONFIG,
  FASTIFY_CORS_CONFIG,
  FASTIFY_JWT_CONFIG,
  FASTIFY_PG_CONFIG,
  FASTIFY_RATE_LIMIT_CONFIG,
} from "./src/configs/fastifyConfig";

/* * * * * * * * * * * * * * * * * * * *
 * FASTIFY SETUP
 * * * * * * * * * * * * * * * * * * * */
const fastify = fastifyCore(FASTIFY_CONFIG);
fastify.register(fastifyPostgres, FASTIFY_PG_CONFIG);
fastify.register(fastifyCookie, FASTIFY_COOKIE_CONFIG);
fastify.register(fastifyJwt, FASTIFY_JWT_CONFIG);
fastify.register(fastifyCors, FASTIFY_CORS_CONFIG);
fastify.register(fastifyRateLimit, FASTIFY_RATE_LIMIT_CONFIG);

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

/* * * * * * * * * * * * * * * * * * * *
 * CUSTOM PLUGIN (socket.io)
 * * * * * * * * * * * * * * * * * * * */

import { Server, Socket } from "socket.io";

const socketIO = new Server(fastify.server, {
  cors: {
    origin: [APP_ORIGIN],
    methods: "GET,POST",
    allowedHeaders: [],
    // credentials: true
  },
});

// middleware (e.g "Sending credentials": https://socket.io/docs/v4/middlewares/)
socketIO.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.info("socket middleware, token: ", token);
  next();
});

fastify.decorate("io", socketIO);

fastify.addHook("onClose", (fastify, done) => {
  fastify.io.close();
  done();
});

fastify.ready(() => {
  // chat
  fastify.io.of("/chat").on("connect", (socket: Socket) => {
    console.info(`[${socket.nsp.name}] Socket ${socket.id} connected!`);
    console.info(
      `[${socket.nsp.name}] Chat clients: ${socket.nsp.sockets.size}`
    );
    console.info(`Total clients: ${fastify.io.engine.clientsCount}`);
    console.info("==========");

    socket.on("disconnect", () => {
      console.info(`[${socket.nsp.name}] Socket ${socket.id} disconnected!`);
      console.info(
        `[${socket.nsp.name}] Chat clients: ${socket.nsp.sockets.size}`
      );
      console.info(`Total clients: ${fastify.io.engine.clientsCount}`);
      console.info("==========");
    });

    socket.on("createdMessage", (msg) => {
      socket.broadcast.emit("newIncomingMessage", msg);
    });
  });

  // tournament TODO set broadcast flag in pg (tournaments)?
  const TEXT_MAX_SOCKET_SIZE = 3;
  fastify.io
    .of(/^\/knockout-tournament-\d+$/)
    .on("connect", (socket: Socket) => {
      console.info("==========");
      console.info(`[${socket.nsp.name}] Socket ${socket.id} connected!`);
      console.info(
        `[${socket.nsp.name}] KO clients: ${socket.nsp.sockets.size}`
      );
      console.info(`Total clients: ${fastify.io.engine.clientsCount}`);

      // limit
      if (socket.nsp.sockets.size > TEXT_MAX_SOCKET_SIZE) {
        console.info(`[${socket.nsp.name}] Max socket limit reached!`);
        console.info(
          `[${socket.nsp.name}] Disconnecting socket ${socket.id}...`
        );
        socket.emit("error", "Max socket limit reached!");
        socket.disconnect();
      }

      socket.on("disconnect", () => {
        console.info("==========");
        console.info(`[${socket.nsp.name}] Socket ${socket.id} disconnected!`);
        console.info(
          `[${socket.nsp.name}] KO clients: ${socket.nsp.sockets.size}`
        );
        console.info(`Total clients: ${fastify.io.engine.clientsCount}`);
      });

      socket.on("join", (room) => {
        console.info("==========");
        console.info(
          `[${socket.nsp.name}] Socket ${socket.id} joining room ${room}`
        );
        socket.join(room);
      });

      socket.on("message", (msg) => {
        console.info("==========");
        console.info(`[${socket.nsp.name}] ${socket.id}: ${msg}`);
      });
    });
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
    fastify.listen({ host: "0.0.0.0", port: 8080 }, (err, address) => {
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
