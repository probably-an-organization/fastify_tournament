import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: number; roleId: number | null }; // payload type is used for signing and verifying
    user: {
      userId: number;
      roleId: number | null;
    }; // user type is return type of `request.user` object
  }
}
