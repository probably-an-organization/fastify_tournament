import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // payload type is used for signing and verifying
    payload: { _id: number };
    // user type is return type of `request.user` object
    user: {
      _id: number;
    };
  }
}
