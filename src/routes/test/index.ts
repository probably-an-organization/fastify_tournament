import { FastifyInstance } from "fastify";

import jwt from "./_routes/jwt";
import mail from "./_routes/mail";
import ping from "./_routes/ping";
import post from "./_routes/post";
import postgres from "./_routes/postgres";
import verifyJwt from "./_routes/verify-jwt";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function testRoutes(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.register(ping);
  fastify.register(mail);
  fastify.register(jwt);
  fastify.register(verifyJwt);
  fastify.register(post);
  fastify.register(postgres);
}
