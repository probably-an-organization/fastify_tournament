import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    authenticate;
    decodeUserToken;
    io;
  }
}
