import { FastifyInstance } from "fastify/types/instance";
import { verifyMail } from "../../../utils/mailUtil";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function mail(fastify: FastifyInstance, options: Object): Promise<void> {
  fastify.get("/mail", async (request, reply): Promise<void> => {
    if (await verifyMail()) {
      reply.code(200).send("Mail valid");
    } else {
      reply.code(400).send("Mail invalid");
    }
  });
}
