import { FastifyInstance } from "fastify/types/instance";

import signUp from "./_routes/sign-up";
import userVerification from "./_routes/user-verification";
import login from "./_routes/login";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function authenticationRoutes(
  fastify: FastifyInstance,
  options: Object
): Promise<void> {
  fastify.register(signUp);
  fastify.register(userVerification);
  fastify.register(login);
}
