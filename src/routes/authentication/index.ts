import { FastifyInstance } from "fastify/types/instance";

import signUp from "./sign-up";
import login from "./login";
import users from "./users";
import user from "./user";
import logout from "./logout";
import signUpVerification from "./sign-up-verification";
import loginVerification from "./login-verification";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function authenticationRoutes(
  fastify: FastifyInstance,
  options: object
): Promise<void> {
  fastify.register(signUp);
  fastify.register(signUpVerification);
  fastify.register(login);
  fastify.register(loginVerification);
  fastify.register(logout);
  fastify.register(users);
  fastify.register(user);
}
